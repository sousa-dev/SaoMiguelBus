/**
 * Merging a real bus position into a timetable-derived track status.
 *
 * Pure on purpose: `computeJourneyStatus` stays exactly what it was — the
 * timetable answer — and this module lays the live answer over it. Every rule
 * for when the live answer is allowed to win lives here, and every one of them
 * is testable without a clock, a socket or a store.
 *
 *   - the bus is only trusted between the rider's boarding and alighting
 *     stops. Before boarding, the timetable phase stands and only the delay is
 *     surfaced; after alighting, the bus is someone else's bus.
 *   - a reading with no stop sequence (detail unreadable) attaches the
 *     position and the freshness but does not move the rider.
 */
import {
  countdownLabel,
  legSpans,
  nowMinutes,
  type JourneyLegStatus,
  type JourneyLiveInfo,
  type JourneyTrackStatus,
  type TrackLabel,
} from '@/lib/bus-tracking';
import type { ActiveTrack, TrackedLeg, TrackedStop } from '@/lib/profile-store';
import type { TransitTripLive, TransitTripLiveVehicle } from '@/lib/types';

/** Start polling this many minutes before the first departure. */
export const LIVE_LOOKAHEAD_MIN = 45;
/** A reading older than this is shown as stale, whatever the server said. */
const STALE_AFTER_MIN = 3;

export function liveTripIds(track: ActiveTrack, journey: JourneyTrackStatus, now: Date): number[] {
  if (track.dataset !== 'azoresbus' || journey.phase === 'completed') {
    return [];
  }
  const legs = (track.legs ?? []).filter((leg) => leg.stops?.length);
  if (legs.length === 0) {
    return [];
  }
  const spans = legSpans(legs);
  const minutesUntilDeparture = spans[0].start - nowMinutes(track.searchDate, now);
  if (journey.phase === 'waiting' && minutesUntilDeparture > LIVE_LOOKAHEAD_MIN) {
    return [];
  }
  return legs
    .map((leg) => leg.tripId)
    .filter((id): id is number => typeof id === 'number' && Number.isFinite(id));
}

export function uniqueLiveTripIds(
  views: { track: ActiveTrack; journey: JourneyTrackStatus }[],
  now: Date,
): number[] {
  const seen = new Set<number>();
  for (const { track, journey } of views) {
    for (const id of liveTripIds(track, journey, now)) {
      seen.add(id);
    }
  }
  return [...seen];
}

function delayMinutes(vehicle: TransitTripLiveVehicle): number | null {
  return typeof vehicle.delaySeconds === 'number' ? Math.round(vehicle.delaySeconds / 60) : null;
}

function liveInfo(legIndex: number, vehicle: TransitTripLiveVehicle): JourneyLiveInfo {
  return {
    legIndex,
    vehicleId: vehicle.id,
    position: vehicle.position,
    delayMinutes: delayMinutes(vehicle),
    currentStopSequence: vehicle.currentStopSequence,
    capturedAt: vehicle.capturedAt,
    stale: vehicle.stale,
  };
}

function findLiveLeg(
  legs: TrackedLeg[],
  trips: TransitTripLive[],
): { legIndex: number; vehicle: TransitTripLiveVehicle } | null {
  for (let i = 0; i < legs.length; i++) {
    const tripId = legs[i].tripId;
    const row = trips.find((t) => t.tripId === tripId && t.state === 'live' && t.vehicle);
    if (row?.vehicle) {
      return { legIndex: i, vehicle: row.vehicle };
    }
  }
  return null;
}

function stopSequence(stop: TrackedStop, fallback: number): number {
  return typeof stop.sequence === 'number' ? stop.sequence : fallback;
}

export function applyLiveToJourney(
  journey: JourneyTrackStatus,
  track: ActiveTrack,
  trips: TransitTripLive[],
  now: Date,
): JourneyTrackStatus {
  const legs = (track.legs ?? []).filter((leg) => leg.stops?.length);
  const found = findLiveLeg(legs, trips);
  if (!found) {
    return { ...journey, live: null };
  }
  const { legIndex, vehicle } = found;
  const leg = legs[legIndex];
  const stops = leg.stops;
  const seq = vehicle.currentStopSequence;
  const live = liveInfo(legIndex, vehicle);

  if (seq == null) {
    return { ...journey, live };
  }

  const board = leg.boardSequence ?? stopSequence(stops[0], 0);
  const alight = leg.alightSequence ?? stopSequence(stops[stops.length - 1], stops.length - 1);
  if (seq < board) {
    // Still on its way to the rider: the timetable phase stands, the delay shows.
    return { ...journey, live };
  }
  if (seq >= alight) {
    // Past the rider's stop: from here on it is not their bus.
    return { ...journey, live: null };
  }

  let currentIndex = 0;
  for (let s = 0; s < stops.length; s++) {
    if (stopSequence(stops[s], s) <= seq) {
      currentIndex = s;
    }
  }
  const nextBySequence = stops.findIndex(
    (stop, s) => stopSequence(stop, s) === vehicle.nextStop?.sequence,
  );
  const nextIndex =
    nextBySequence > currentIndex ? nextBySequence : Math.min(currentIndex + 1, stops.length - 1);
  const current = stops[currentIndex];
  const next = nextIndex > currentIndex ? stops[nextIndex] : null;
  const timeToNext = vehicle.nextStop?.dueInMinutes ?? journey.timeToNextStopMin;
  const legProgress =
    stops.length > 1 ? Math.round((currentIndex / (stops.length - 1)) * 100) : 0;

  let statusKey = 'trackStatusEnRoute';
  if (timeToNext <= 2) {
    statusKey = 'trackStatusArrivingSoon';
  } else if (timeToNext <= 5) {
    statusKey = 'trackStatusApproaching';
  }

  const spans = legSpans(legs);
  const delay = live.delayMinutes ?? 0;
  const arrivalIn = spans[legIndex].end - nowMinutes(track.searchDate, now) + delay;

  const legViews: JourneyLegStatus[] = journey.legs.map((view, i) => ({
    ...view,
    state: i < legIndex ? 'done' : i === legIndex ? 'riding' : 'upcoming',
    progress: i < legIndex ? 100 : i === legIndex ? legProgress : 0,
  }));

  return {
    ...journey,
    phase: 'riding',
    statusLabel: { key: statusKey },
    countdown: countdownLabel(Math.max(0, arrivalIn)),
    legIndex,
    currentStop: { name: current.name, time: current.time },
    nextStop: next ? { name: next.name, time: next.time } : null,
    timeToNextStopMin: timeToNext,
    transfer: null,
    legs: legViews,
    live,
  };
}

export function journeyLiveFootnote(journey: JourneyTrackStatus, now: Date): TrackLabel {
  const live = journey.live;
  if (!live) {
    return { key: 'trackPositionEstimated' };
  }
  const captured = Date.parse(live.capturedAt);
  const ageMin = Number.isFinite(captured)
    ? Math.max(0, Math.round((now.getTime() - captured) / 60_000))
    : STALE_AFTER_MIN;
  if (live.stale || ageMin >= STALE_AFTER_MIN) {
    return { key: 'trackPositionLiveStale', params: { minutes: ageMin } };
  }
  const delay = live.delayMinutes;
  if (delay == null || Math.abs(delay) < 2) {
    return { key: 'trackPositionLiveOnTime' };
  }
  return delay > 0
    ? { key: 'trackPositionLiveLate', params: { minutes: delay } }
    : { key: 'trackPositionLiveEarly', params: { minutes: -delay } };
}
