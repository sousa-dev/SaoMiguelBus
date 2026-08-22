/**
 * Itinerary + preferences + a clock → the exact instants to alarm at.
 *
 * PURE. No `Date.now()`, no storage, no OS, no i18n. Every input is a parameter,
 * which is what lets the whole of 09 §2 test it under `tsx --test` without a
 * React Native runtime anywhere near it.
 *
 * **The time maths is borrowed, not rewritten (KTD3).** `lib/bus-tracking.ts`
 * already computes absolute minute offsets for every leg and stop of an
 * itinerary, and its header records what that cost: legs that look like they run
 * backwards across midnight, stop lists that must never be re-sorted, and a
 * `toISOString()` bug that anchored a bus leaving in 15 minutes to tomorrow's
 * midnight and displayed a 24-hour countdown. This module consumes `legSpans`,
 * `stopMinutes` and `departureDayStart` and converts their minutes to `Date`s.
 * Re-deriving any of it would fork the one piece of this domain that is known
 * correct, and would do it in the module where being wrong means a rider gets
 * off the bus in the wrong village.
 */

import { departureDayStart, legSpans, stopMinutes } from '@/lib/bus-tracking';
import type { AlarmType, NotificationPrefs } from '@/lib/notifications/types';
import type { ActiveTrack } from '@/lib/profile-store';

/**
 * How far before the end of a final leg the `alight` alarm falls back to when
 * that leg has no second-to-last stop to aim at.
 */
export const ALIGHT_FALLBACK_MIN = 3;

/**
 * Ceiling on pending alarms across every armed track (04 §5).
 *
 * iOS keeps only the **64 soonest-firing** pending local notifications per app
 * and silently discards the rest. With per-stop alarms rejected (KTD5) the real
 * arithmetic is comfortable — five tracks with two changes each is about 25 —
 * so this is unreachable in normal use. It exists anyway, because "unreachable"
 * and "impossible" are different words, and because a deliberate drop with a log
 * line beats iOS discarding the overflow where nobody can see it.
 */
export const MAX_SCHEDULED_ALARMS = 48;

export interface PlannedAlarm {
  type: AlarmType;
  /** Absolute instant to fire. */
  at: Date;
  /** Which leg this concerns — 0-based. */
  legIndex: number;
  /**
   * Interpolation for the copy: stop names, route numbers, minute counts.
   *
   * `tight` is the one entry that is a SELECTOR rather than an interpolation —
   * `content.ts` reads it to choose the urgent wording for a tight change and
   * i18next simply ignores the unused variable (04 §3.2).
   *
   * Minute counts are keyed `minutes`, never `count`: `count` is what i18next
   * resolves plurals against, and every locale here abbreviates the unit
   * invariantly. `TrackLabel` in `lib/bus-tracking.ts` set that convention
   * (07 §2 rule 4).
   */
  params: Record<string, string | number | boolean>;
}

export interface JourneyAlarmPlan {
  /** What will actually be scheduled, soonest first. */
  alarms: PlannedAlarm[];
  /**
   * How many alarms the preferences asked for that had already passed.
   *
   * Two callers need this and neither can recover it from `alarms`: the card
   * caption, which says "some alerts were skipped — this journey has already
   * started" rather than quietly arming fewer than the rider chose (02 §5), and
   * `notifications.arm`'s `alarms_skipped_past` property. A high value there
   * points at `DEFAULT_SEARCH_TIME = '00:00'` returning the whole service day —
   * a UX problem this feature would merely be surfacing (08 §2).
   */
  skippedPast: number;
}

/**
 * Every alarm the rider's preferences call for on this itinerary, soonest first.
 *
 * Anything that would fire at or before `now` is dropped here, before it can
 * reach the OS — see `isStillAhead`. If nothing survives, the answer is `[]` and
 * the UI refuses the arm with an explanation rather than filling the bell over
 * nothing (02 §5).
 */
export function planJourneyAlarms(
  track: Pick<ActiveTrack, 'legs' | 'transfers' | 'searchDate'>,
  prefs: NotificationPrefs,
  now: Date,
): PlannedAlarm[] {
  return planJourneyAlarmsDetailed(track, prefs, now).alarms;
}

/**
 * The same plan, plus how much of it the past-instant rule removed.
 *
 * The filtering lives here and only here, so the count and the alarms can never
 * disagree about what was dropped.
 */
export function planJourneyAlarmsDetailed(
  track: Pick<ActiveTrack, 'legs' | 'transfers' | 'searchDate'>,
  prefs: NotificationPrefs,
  now: Date,
): JourneyAlarmPlan {
  // Same tolerance `trackLegs` applies in `lib/bus-tracking.ts`: a record the
  // persist migration could not lift keeps an empty `legs`, and a leg with no
  // stops carries no times to plan against. Neither is an error — `liftTrackedRecord`
  // deliberately preserves such records rather than dropping a rider's data.
  const legs = (track.legs ?? []).filter((leg) => leg.stops?.length);
  if (legs.length === 0) {
    return { alarms: [], skippedPast: 0 };
  }

  const spans = legSpans(legs);
  const transfers = track.transfers ?? [];
  const dayStart = departureDayStart(track.searchDate, now);
  /** Minutes since the departure day's local midnight → an absolute instant. */
  const instantAt = (minutes: number) => new Date(dayStart + minutes * 60_000);

  const first = spans[0];
  const last = spans[spans.length - 1];
  const lastIndex = spans.length - 1;
  const alarms: PlannedAlarm[] = [];

  if (prefs.leaveNow.enabled) {
    alarms.push({
      type: 'leaveNow',
      at: instantAt(first.start - prefs.leaveNow.leadMinutes),
      legIndex: 0,
      params: {
        route: legs[0].routeNumber,
        stop: first.stops[0].name,
        minutes: prefs.leaveNow.leadMinutes,
      },
    });
  }

  if (prefs.change.enabled) {
    // One per change, and each one counts down to the BOARDING of the next leg
    // rather than to the arrival of the previous one. `computeJourneyStatus`
    // already settled this: during a transfer its `legIndex` is the leg being
    // boarded, "so this names the bus the rider is waiting for rather than the
    // one they just left." An alarm counting down to a bus the rider is already
    // off is useless (04 §3.1).
    for (let i = 0; i + 1 < spans.length; i += 1) {
      const boarding = spans[i + 1];
      // `transfers[i]` sits between legs i and i+1, indexed against the filtered
      // leg list exactly as `computeJourneyStatus` indexes it.
      const transfer = transfers[i];
      alarms.push({
        type: 'change',
        at: instantAt(boarding.start - prefs.change.leadMinutes),
        legIndex: i + 1,
        params: {
          route: legs[i + 1].routeNumber,
          stop: transfer?.at ?? boarding.stops[0].name,
          minutes: prefs.change.leadMinutes,
          // A tight change is the one moment this feature genuinely earns its
          // subscription, and it gets its own, more urgent copy (04 §3.2).
          tight: transfer?.tight ?? false,
        },
      });
    }
  }

  if (prefs.alight.enabled) {
    const alight = planAlight(last, lastIndex, instantAt);
    if (alight) {
      alarms.push(alight);
    }
  }

  if (prefs.complete.enabled) {
    alarms.push({
      type: 'complete',
      at: instantAt(last.end),
      legIndex: lastIndex,
      params: { stop: last.stops[last.stops.length - 1].name },
    });
  }

  const ahead = alarms.filter((alarm) => isStillAhead(alarm.at, now));
  return {
    alarms: ahead.sort((a, b) => a.at.getTime() - b.at.getTime()),
    skippedPast: alarms.length - ahead.length,
  };
}

/**
 * "Get off at the next stop" — fired at the second-to-last stop of the FINAL
 * leg, and naming the last one, because that is what the sentence means.
 *
 * The degenerate case is a final leg with fewer than two stops: a legacy record,
 * or a genuine one-stop hop. There is no second-to-last stop to fire at, so it
 * falls back to a few minutes before the arrival — and if even that lands before
 * the leg has started, the alarm is dropped rather than fired at a rider who has
 * not boarded yet (04 §3.1).
 */
function planAlight(
  last: { stops: { name: string; time: string; dayOffset?: number }[]; start: number; end: number },
  legIndex: number,
  instantAt: (minutes: number) => Date,
): PlannedAlarm | null {
  const destination = last.stops[last.stops.length - 1];
  let minutes: number;

  if (last.stops.length >= 2) {
    minutes = stopMinutes(last.stops[last.stops.length - 2]);
  } else {
    minutes = last.end - ALIGHT_FALLBACK_MIN;
    if (minutes < last.start) {
      return null;
    }
  }

  return {
    type: 'alight',
    at: instantAt(minutes),
    legIndex,
    params: { stop: destination.name },
  };
}

/**
 * The past-instant rule (R14), and the reason it is not an edge case.
 *
 * `scheduleNotificationAsync` with a past `DATE` trigger fires IMMEDIATELY on
 * some platforms, so a rider arming a journey already under way would get "time
 * to leave!" the instant they tapped, for a bus they are sitting on.
 *
 * This happens routinely rather than rarely: `TransitScreen` defaults the search
 * time to `00:00`, so the results list contains the whole service day and
 * already-departed journeys are normally on screen — the same reality
 * `deriveTrackExpiry` accommodates with its `MIN_TRACK_TTL_MS` floor, noting
 * that tracking a finished trip "is a legitimate thing to do by accident."
 *
 * Strictly greater than: an alarm landing exactly on `now` is in the past by the
 * time the OS has it.
 */
function isStillAhead(at: Date, now: Date): boolean {
  return at.getTime() > now.getTime();
}
