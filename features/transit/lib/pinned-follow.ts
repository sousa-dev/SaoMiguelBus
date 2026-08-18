/**
 * Re-resolve a pinned itinerary against a real timetable, so "Seguir viagem"
 * follows a bus instead of re-running a search (09 §3.3, §4).
 *
 * A pin cannot be tracked from what it stores. `resolvePinnedRoutes` DROPS every
 * `legs[].tripId` at cutover on purpose — a trip PK from the other network is
 * worse than none (user-data-migration.ts) — and even within one network the ids
 * roll overnight. What survives is the shape of the journey: which routes, in
 * which order, leaving at which time. That is enough to find the same itinerary
 * in today's answers.
 *
 * Matching is deliberately STRICT on the departure. A pin is a specific run —
 * "the 09h15" — not "some 110 → 205". Handing the rider the 11h15 because the
 * 09h15 has gone would start a countdown against a bus they are not taking.
 * When the pinned run is not available today we say when it next departs
 * instead, which is why this walks forward over service days rather than only
 * looking at today.
 *
 * Everything here is pure: the caller does the fetching.
 */

import { journeyAsActiveTrack } from '@/features/transit/lib/journey-legs';
import { computeJourneyStatus, timeStringToMinutes } from '@/lib/bus-tracking';
import type { PinnedRoute } from '@/lib/profile-store';
import { displayRouteNumber, resolveDayType, type DayType } from '@/lib/transit-format';
import type { TransitJourney } from '@/lib/types';
import { journeyRideLegs } from '@/lib/types';

/**
 * How far ahead to look for the next departure.
 *
 * Seven days is exhaustive rather than arbitrary: service is keyed on three day
 * types, and every one of them recurs inside a week. It also covers the case a
 * shorter window would get wrong — a public holiday runs Sunday service, so a
 * weekday pin tapped on a holiday Tuesday must look past tomorrow to find a real
 * weekday.
 */
export const FOLLOW_HORIZON_DAYS = 7;

/**
 * Slack on the pinned departure, in minutes.
 *
 * Absorbs a timetable edit — an operator moving a departure by a minute must not
 * silently break a pin — without ever reaching a neighbouring run: headways on
 * this network are measured in tens of minutes, not fives.
 */
export const DEPARTURE_TOLERANCE_MIN = 5;

/** One day of the horizon, with the answers for it. */
export interface FollowDay {
  /** Local `YYYY-MM-DD`. */
  date: string;
  dayType: DayType;
  journeys: TransitJourney[];
}

export type PinnedFollowOutcome =
  /** The pinned run is today and has not finished — track it. */
  | { status: 'track'; journey: TransitJourney; dayType: DayType }
  /** Not available today; this is when it next leaves. */
  | { status: 'later'; date: string; dayType: DayType; time: string }
  /** Nothing in the horizon runs this itinerary at this time any more. */
  | { status: 'none' };

/** Local `YYYY-MM-DD` — never `toISOString()`, which is UTC (see bus-tracking). */
function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Today first, then each following calendar day with the service it runs.
 *
 * Dates are stepped with `setDate`, which is DST-safe — adding 86 400 000 ms is
 * not, and the Azores do change clocks.
 */
export function nextServiceDays(
  now: Date,
  holidays?: { date: string }[],
  days = FOLLOW_HORIZON_DAYS,
): { date: string; dayType: DayType }[] {
  const out: { date: string; dayType: DayType }[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    date.setDate(date.getDate() + i);
    out.push({ date: isoDate(date), dayType: resolveDayType(date, holidays) });
  }
  return out;
}

/** `C110` and `110` are the same line; the `C` is a confidence prefix, not an id. */
function normalizeRoute(route: string): string {
  return displayRouteNumber(route).trim().toUpperCase();
}

/** The routes a journey rides, in order. */
export function journeyRouteSequence(journey: TransitJourney): string[] {
  return journeyRideLegs(journey).map((leg) => normalizeRoute(leg.route));
}

/** The routes a pin rides, in order. */
export function pinRouteSequence(pin: PinnedRoute): string[] {
  return (pin.legs ?? []).map((leg) => normalizeRoute(leg.routeNumber));
}

function sameSequence(a: string[], b: string[]): boolean {
  return a.length > 0 && a.length === b.length && a.every((value, i) => value === b[i]);
}

/** Minutes between a journey's first boarding and the pin's stored departure. */
function departureDrift(journey: TransitJourney, pin: PinnedRoute): number | null {
  const board = journeyRideLegs(journey)[0]?.board.time;
  const pinned = pin.legs?.[0]?.start;
  if (!board || !pinned) {
    return null;
  }
  return Math.abs(timeStringToMinutes(board) - timeStringToMinutes(pinned));
}

/** Same routes in the same order, leaving at the time that was pinned. */
export function matchesPin(journey: TransitJourney, pin: PinnedRoute): boolean {
  if (!sameSequence(journeyRouteSequence(journey), pinRouteSequence(pin))) {
    return false;
  }
  const drift = departureDrift(journey, pin);
  return drift !== null && drift <= DEPARTURE_TOLERANCE_MIN;
}

/**
 * The pinned run among a day's answers: an exact departure wins, and the
 * tolerance is only ever consulted when nothing left at the pinned minute.
 */
export function findPinnedJourney(
  journeys: TransitJourney[],
  pin: PinnedRoute,
): TransitJourney | null {
  let best: TransitJourney | null = null;
  let bestDrift = Number.POSITIVE_INFINITY;
  for (const journey of journeys) {
    if (!matchesPin(journey, pin)) {
      continue;
    }
    const drift = departureDrift(journey, pin) ?? Number.POSITIVE_INFINITY;
    if (drift < bestDrift) {
      best = journey;
      bestDrift = drift;
    }
    if (bestDrift === 0) {
      break;
    }
  }
  return best;
}

/**
 * Whether today's match still has something left to show.
 *
 * Reuses `computeJourneyStatus` rather than comparing times here, so the day
 * offsets, the past-midnight carry and the local-date anchoring all behave
 * exactly as they do in the widget. A run in its `waiting` phase counts as
 * followable — the countdown to boarding is precisely what the rider asked for.
 */
function hasFinished(journey: TransitJourney, dayType: DayType, date: string, now: Date): boolean {
  const track = journeyAsActiveTrack(journey, dayType, null, displayRouteNumber, date);
  return computeJourneyStatus(track, now).phase === 'completed';
}

/**
 * What tapping "Seguir viagem" should do, given the horizon's answers.
 *
 * `days` is today first, ascending — `nextServiceDays` order.
 */
export function resolvePinnedFollow(
  pin: PinnedRoute,
  days: FollowDay[],
  now: Date,
): PinnedFollowOutcome {
  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    const journey = findPinnedJourney(day.journeys, pin);
    if (!journey) {
      continue;
    }
    // Only today can be half-over. A match on any later day is by definition
    // still ahead, so it is reported rather than phase-checked.
    if (i === 0 && hasFinished(journey, day.dayType, day.date, now)) {
      continue;
    }
    if (i === 0) {
      return { status: 'track', journey, dayType: day.dayType };
    }
    return {
      status: 'later',
      date: day.date,
      dayType: day.dayType,
      time: journeyRideLegs(journey)[0]?.board.time ?? pin.legs?.[0]?.start ?? '',
    };
  }
  return { status: 'none' };
}
