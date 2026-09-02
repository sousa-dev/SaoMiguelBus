/**
 * The countdown behind the premium tracking widget.
 *
 * Two things changed here for the AzoresBus network (09 §3.3):
 *
 *  1. **Journeys, not trips.** A tracked itinerary is a list of legs with the
 *     changes between them, so the gap between two buses reads as a WAIT rather
 *     than as a very slow ride. `computeBusStatus` is the one-leg special case of
 *     `computeJourneyStatus` and stays for single-trip cards.
 *  2. **Time is absolute, not wall-clock.** Stop times carry no date, so a leg
 *     that runs 23h50 → 00h10 looks like it goes backwards. Every comparison here
 *     is in minutes since the itinerary's first departure DAY, with `dayOffset`
 *     folded in — and stops are never re-sorted, which is what used to scramble a
 *     past-midnight leg.
 *
 * Labels are returned as i18n descriptors, never as English literals: this is a
 * paid widget and a Portuguese subscriber was reading it in English (09 §2 Gap D).
 * Rendering is the caller's job — `t(label.key, label.params)`.
 */

import type {
  ActiveTrack,
  TrackedLeg,
  TrackedStop,
  TrackedTransfer,
} from '@/lib/profile-store';
import type { TripStop, TransitSearchResult } from '@/lib/types';

export type TrackPhase = 'waiting' | 'active' | 'completed' | 'unknown';

/** Where the rider is in a multi-leg itinerary (09 §3.3). */
export type JourneyTrackPhase = 'waiting' | 'riding' | 'transferring' | 'completed';

/**
 * An i18n key plus its interpolation values. The caller runs it through `t`.
 *
 * Values are `string | number` because the position lines interpolate stop and
 * route NAMES as well as minute counts. Minute counts are passed as `minutes`,
 * never `count`: `count` is what i18next resolves plurals against, and every
 * locale here abbreviates the unit invariantly, exactly as `trackStatusMinutes`
 * and `trackStatusTransferWait` already do.
 */
export interface TrackLabel {
  key: string;
  params?: Record<string, string | number>;
}

export interface BusTrackStatus {
  phase: TrackPhase;
  statusLabel: TrackLabel;
  countdown: TrackLabel;
  progress: number;
  currentStop: TripStop | null;
  nextStop: TripStop | null;
  timeToNextStopMin: number;
}

/** Per-leg state, for the leg strip the active-tracking row renders (09 §3.4). */
export interface JourneyLegStatus {
  routeNumber: string;
  origin: string;
  destination: string;
  /** Scheduled arrival at this leg's alight, as a wall clock. */
  arrival: string;
  state: 'done' | 'riding' | 'upcoming';
  progress: number;
}

/** The real bus behind a leg, when the AVL feed could attribute one. */
export interface JourneyLiveInfo {
  legIndex: number;
  vehicleId: string;
  position: { lat: number; lon: number };
  /** Minutes late (negative early), rounded; null when upstream gave no delay. */
  delayMinutes: number | null;
  currentStopSequence: number | null;
  capturedAt: string;
  stale: boolean;
}

export interface JourneyTrackStatus {
  phase: JourneyTrackPhase;
  statusLabel: TrackLabel;
  countdown: TrackLabel;
  /** Across the whole itinerary, waits included. */
  progress: number;
  /** Index of the leg being ridden, or the one about to be boarded. */
  legIndex: number;
  currentStop: TripStop | null;
  nextStop: TripStop | null;
  timeToNextStopMin: number;
  /** The change being made right now, while `phase === 'transferring'`. */
  transfer: TrackedTransfer | null;
  /** Every change in the itinerary, `transfers[i]` sitting before `legs[i + 1]`. */
  transfers: TrackedTransfer[];
  legs: JourneyLegStatus[];
  /**
   * Set only by `features/transit/lib/live-track.ts` once a real AVL position
   * has been merged in. `computeJourneyStatus` never sets it: the timetable
   * status is the input to that merge, not its output.
   */
  live?: JourneyLiveInfo | null;
}

const MINUTES_PER_DAY = 1440;

export function isTrackExpired(track: ActiveTrack, now = Date.now()): boolean {
  return track.expiresAt <= now;
}

export function timeStringToMinutes(time: string): number {
  const normalized = time.replace('h', ':');
  const [h, m] = normalized.split(':').map((x) => parseInt(x, 10));
  if (!Number.isFinite(h)) {
    return 0;
  }
  return h * 60 + (Number.isFinite(m) ? m : 0);
}

/**
 * Stamp each stop with the day it falls on, by watching the clock wrap.
 *
 * The API sends a leg's stops in travel order with bare wall-clock times, so the
 * only evidence that a leg crossed midnight is a time going backwards. Deriving
 * the offsets once here means everything downstream compares plain numbers, and
 * it repairs legacy night buses too — they never carried offsets and have been
 * mis-sorted all along (09 §3.3).
 */
export function withDayOffsets(stops: TripStop[], startOffset = 0): TrackedStop[] {
  let offset = startOffset;
  let previous = -Infinity;
  return stops.map((stop) => {
    const minutes = timeStringToMinutes(stop.time);
    if (minutes < previous) {
      offset += 1;
    }
    previous = minutes;
    return { ...stop, dayOffset: offset };
  });
}

/**
 * Minutes since midnight of the itinerary's first day.
 *
 * Exported for the notification planner, which resolves the "get off at the next
 * stop" alarm against a specific stop of the final leg. It must use THIS
 * arithmetic and not its own: the `dayOffset` multiplication is the single line
 * that stops a past-midnight stop reading as 23 hours in the past, and a second
 * copy of it is a second place for that bug to come back (notifications 04 §2).
 */
export function stopMinutes(stop: TrackedStop): number {
  return timeStringToMinutes(stop.time) + (stop.dayOffset ?? 0) * MINUTES_PER_DAY;
}

/**
 * A leg's stops in travel order, with day offsets guaranteed.
 *
 * Deliberately does NOT sort. The previous implementation sorted on
 * minutes-since-midnight, which reorders exactly the legs this function now
 * exists to get right. Travel order is what the server sent.
 */
function segmentStops(stops: TrackedStop[], startOffset = 0): TrackedStop[] {
  if (stops.length === 0) {
    return [];
  }
  const stamped = stops.some((s) => s.dayOffset != null)
    ? stops
    : withDayOffsets(stops, startOffset);
  return stamped;
}

/**
 * Which day `now` is on, relative to the day the itinerary departs.
 *
 * Without this a journey ending at 00h30 would be compared against a `now` of
 * 00h10 read as minute 10 of the FIRST day — 23 hours in the past — and the
 * countdown would jump backwards, which is the bug 09 §3.3 asks to be kept out.
 */
function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * Today as `YYYY-MM-DD` in LOCAL time — never `toISOString()`, which is UTC.
 *
 * `departureDayStart` parses this back with `new Date(y, m - 1, d)`, i.e. as a
 * local date. Writing it in UTC makes the two disagree for the part of the day
 * either side of midnight: at 23h30 Azores winter (UTC-1) `toISOString()`
 * already reads tomorrow, so the countdown anchored a bus leaving in 15 minutes
 * to tomorrow's midnight and displayed ~24h.
 */
export function localIsoDate(date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Local midnight of the day the itinerary departs — the origin of every offset.
 *
 * Exported for the notification planner (notifications 04 §2.1), which turns the
 * minute offsets `legSpans` produces back into absolute `Date` instants to hand
 * the OS. Note it parses `searchDate` as a LOCAL date, which is exactly why
 * `localIsoDate()` — never `toISOString()` — has to have been what wrote it.
 */
export function departureDayStart(searchDate: string | undefined, now: Date): number {
  if (searchDate) {
    const [y, m, d] = searchDate.split('-').map((part) => parseInt(part, 10));
    if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
      return new Date(y, m - 1, d).getTime();
    }
  }
  return startOfLocalDay(now);
}

export function nowMinutes(searchDate: string | undefined, now: Date): number {
  const wallClock = now.getHours() * 60 + now.getMinutes();
  const dayIndex = Math.round(
    (startOfLocalDay(now) - departureDayStart(searchDate, now)) / 86_400_000,
  );
  return dayIndex * MINUTES_PER_DAY + wallClock;
}

export function countdownLabel(minutes: number, mode: 'departure' | 'arrival' = 'arrival'): TrackLabel {
  if (minutes <= 0) {
    return { key: mode === 'departure' ? 'trackStatusDepartingNow' : 'trackStatusArrivingNow' };
  }
  if (minutes < 60) {
    return { key: 'trackStatusMinutes', params: { count: minutes } };
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0
    ? { key: 'trackStatusHoursMinutes', params: { hours, minutes: rest } }
    : { key: 'trackStatusHours', params: { hours } };
}

/** The legs of a track, tolerating a record the persist migration could not lift. */
function trackLegs(track: Pick<ActiveTrack, 'legs'>): TrackedLeg[] {
  return (track.legs ?? []).filter((leg) => leg.stops?.length);
}

/**
 * Absolute minutes for every leg, in one pass, so day offsets accumulate ACROSS
 * legs: a second bus boarded after midnight is on day 1 even though its own stop
 * list never wraps.
 *
 * Exported for the notification planner (notifications 04 §2.1, KTD3) —
 * visibility only, no behaviour change. Re-deriving these offsets elsewhere is
 * the single most likely way to ship an alarm on the wrong day, so the planner
 * consumes this rather than computing its own.
 */
export function legSpans(legs: TrackedLeg[]): { stops: TrackedStop[]; start: number; end: number }[] {
  const spans: { stops: TrackedStop[]; start: number; end: number }[] = [];
  let previousEnd = -Infinity;
  let carry = 0;
  for (const leg of legs) {
    let stops = segmentStops(leg.stops, carry);
    // A leg cannot board before the previous one lands. When it looks like it
    // does, the change ran over midnight and this leg is on the next day — the
    // 23h55 → 00h20 case, where nothing inside either leg's own stop list wraps
    // and only the boundary between them gives it away.
    if (stopMinutes(stops[0]) < previousEnd) {
      carry += 1;
      stops = segmentStops(leg.stops.map(({ dayOffset: _drop, ...s }) => s), carry);
    }
    const start = stopMinutes(stops[0]);
    const end = stopMinutes(stops[stops.length - 1]);
    carry = stops[stops.length - 1].dayOffset ?? 0;
    previousEnd = end;
    spans.push({ stops, start, end });
  }
  return spans;
}

/**
 * The whole itinerary as one status: which leg, riding or waiting, how long.
 *
 * `waiting → riding → transferring → riding → completed`. The transferring state
 * counts down to the NEXT boarding rather than to the bus the rider just left,
 * and surfaces the transfer so a tight change can be called out — that moment is
 * the one this feature is genuinely worth money for.
 */
export function computeJourneyStatus(
  track: Pick<ActiveTrack, 'legs' | 'transfers' | 'searchDate' | 'nextDeparture'>,
  now = new Date(),
): JourneyTrackStatus {
  const legs = trackLegs(track);
  const transfers = track.transfers ?? [];

  if (legs.length === 0) {
    return {
      phase: 'waiting',
      statusLabel: { key: 'trackStatusTracking' },
      countdown: { key: 'trackStatusWaiting' },
      progress: 0,
      legIndex: 0,
      currentStop: null,
      nextStop: null,
      timeToNextStopMin: 0,
      transfer: null,
      transfers: [],
      legs: [],
    };
  }

  const spans = legSpans(legs);
  const current = nowMinutes(track.searchDate, now);
  const first = spans[0];
  const last = spans[spans.length - 1];

  const legViews = (activeIndex: number, activeProgress: number): JourneyLegStatus[] =>
    legs.map((leg, i) => ({
      routeNumber: leg.routeNumber,
      origin: leg.origin,
      destination: leg.destination,
      arrival: leg.end,
      state: i < activeIndex ? 'done' : i === activeIndex ? 'riding' : 'upcoming',
      progress: i < activeIndex ? 100 : i === activeIndex ? activeProgress : 0,
    }));

  const totalSpan = last.end - first.start;
  const overallProgress = (at: number) =>
    totalSpan > 0 ? Math.min(100, Math.max(0, Math.round(((at - first.start) / totalSpan) * 100))) : 0;

  // Before the first bus leaves.
  if (current < first.start) {
    const until = first.start - current;
    return {
      phase: 'waiting',
      statusLabel: { key: 'trackStatusWaiting' },
      countdown: countdownLabel(until, 'departure'),
      progress: 0,
      legIndex: 0,
      currentStop: null,
      nextStop: { name: first.stops[0].name, time: first.stops[0].time },
      timeToNextStopMin: until,
      transfer: null,
      transfers,
      legs: legViews(-1, 0),
    };
  }

  // After the last bus lands.
  if (current > last.end) {
    const lastStop = last.stops[last.stops.length - 1];
    return {
      phase: 'completed',
      statusLabel: { key: 'trackStatusCompleted' },
      countdown: { key: 'trackStatusFinished' },
      progress: 100,
      legIndex: legs.length - 1,
      currentStop: { name: lastStop.name, time: lastStop.time },
      nextStop: null,
      timeToNextStopMin: 0,
      transfer: null,
      transfers,
      legs: legViews(legs.length, 100),
    };
  }

  for (let i = 0; i < spans.length; i++) {
    const span = spans[i];

    // Riding leg i.
    if (current >= span.start && current <= span.end) {
      const stops = span.stops;
      let currentIndex = 0;
      let nextIndex = stops.length > 1 ? 1 : 0;
      for (let s = 0; s < stops.length - 1; s++) {
        if (current >= stopMinutes(stops[s]) && current < stopMinutes(stops[s + 1])) {
          currentIndex = s;
          nextIndex = s + 1;
          break;
        }
      }
      if (current >= span.end) {
        currentIndex = stops.length - 1;
        nextIndex = stops.length - 1;
      }
      const at = stops[currentIndex];
      const next = nextIndex > currentIndex ? stops[nextIndex] : null;
      const timeToNext = next ? Math.max(0, stopMinutes(next) - current) : 0;
      const legSpanMinutes = span.end - span.start;
      const legProgress =
        legSpanMinutes > 0
          ? Math.min(100, Math.max(0, Math.round(((current - span.start) / legSpanMinutes) * 100)))
          : 0;

      let statusKey = 'trackStatusEnRoute';
      if (timeToNext <= 2) {
        statusKey = 'trackStatusArrivingSoon';
      } else if (timeToNext <= 5) {
        statusKey = 'trackStatusApproaching';
      }

      return {
        phase: 'riding',
        statusLabel: { key: statusKey },
        countdown: countdownLabel(Math.max(0, span.end - current)),
        progress: overallProgress(current),
        legIndex: i,
        currentStop: { name: at.name, time: at.time },
        nextStop: next ? { name: next.name, time: next.time } : null,
        timeToNextStopMin: timeToNext,
        transfer: null,
        transfers,
        legs: legViews(i, legProgress),
      };
    }

    // In the gap between leg i and leg i+1 — a change, not a ride.
    const upcoming = spans[i + 1];
    if (upcoming && current > span.end && current < upcoming.start) {
      const until = upcoming.start - current;
      const transfer = transfers[i] ?? null;
      const board = upcoming.stops[0];
      return {
        phase: 'transferring',
        // A tight change is the one moment this widget earns its subscription.
        statusLabel: { key: transfer?.tight ? 'trackStatusTransferTight' : 'trackStatusTransferring' },
        countdown: countdownLabel(until, 'departure'),
        progress: overallProgress(current),
        // The leg the rider is about to board — that is what they need next.
        legIndex: i + 1,
        currentStop: {
          name: span.stops[span.stops.length - 1].name,
          time: span.stops[span.stops.length - 1].time,
        },
        nextStop: { name: board.name, time: board.time },
        timeToNextStopMin: until,
        transfer,
        transfers,
        legs: legViews(i + 1, 0),
      };
    }
  }

  // Unreachable for well-formed spans; a defensive echo rather than a throw.
  return {
    phase: 'riding',
    statusLabel: { key: 'trackStatusEnRoute' },
    countdown: countdownLabel(Math.max(0, last.end - current)),
    progress: overallProgress(current),
    legIndex: 0,
    currentStop: null,
    nextStop: null,
    timeToNextStopMin: 0,
    transfer: null,
    transfers,
    legs: legViews(0, 0),
  };
}

/** The two lines that answer "where is it?" — see `journeyPositionLabels`. */
export interface JourneyPositionLabels {
  primary: TrackLabel;
  secondary: TrackLabel | null;
}

/**
 * Where the bus is, as i18n descriptors.
 *
 * `computeJourneyStatus` has always known the answer — `currentStop`, `nextStop`
 * and `timeToNextStopMin` are computed on every tick — and until now nothing
 * rendered any of it, so the paid widget said "En route · 24 min" and left the
 * rider to guess which of the twelve stops that meant.
 *
 * "Where is it" means something different in each phase, so each gets its own
 * pair: the stop it is due to leave from while WAITING, the stop behind and the
 * stop ahead while RIDING, the interchange and the bus being caught while
 * TRANSFERRING, and the final stop once COMPLETED.
 *
 * Every number here is derived from the timetable. There is no live vehicle feed
 * on this network, which is why the row also carries `trackPositionEstimated` —
 * a rider must not read an estimate as a GPS fix.
 */
export function journeyPositionLabels(status: JourneyTrackStatus): JourneyPositionLabels {
  // Never negative: a bus sitting exactly on its scheduled minute reads "now",
  // not "-0 min".
  const minutes = Math.max(0, Math.round(status.timeToNextStopMin));

  switch (status.phase) {
    case 'waiting': {
      if (!status.nextStop) {
        return { primary: { key: 'trackStatusTracking' }, secondary: null };
      }
      return {
        primary: { key: 'trackPositionBoardsAt', params: { stop: status.nextStop.name } },
        secondary: { key: 'trackPositionDepartsIn', params: { minutes } },
      };
    }

    case 'riding': {
      // No next stop means the bus is standing at the leg's last stop.
      if (!status.nextStop) {
        const last = status.currentStop?.name ?? status.legs[status.legIndex]?.destination;
        return {
          primary: last
            ? { key: 'trackPositionFinalStop', params: { stop: last } }
            : { key: 'trackStatusEnRoute' },
          secondary: null,
        };
      }
      return {
        primary: status.currentStop
          ? { key: 'trackPositionPassed', params: { stop: status.currentStop.name } }
          : { key: 'trackStatusEnRoute' },
        secondary: {
          key: 'trackPositionNextStop',
          params: { stop: status.nextStop.name, minutes },
        },
      };
    }

    case 'transferring': {
      // `legIndex` is already the leg being BOARDED, so this names the bus the
      // rider is waiting for rather than the one they just left.
      const at = status.transfer?.at ?? status.nextStop?.name;
      const route = status.legs[status.legIndex]?.routeNumber ?? '';
      return {
        primary: at
          ? { key: 'trackPositionChangeAt', params: { stop: at, route } }
          : { key: 'trackStatusTransferring' },
        secondary: {
          key: status.transfer?.tight ? 'trackPositionChangeTightIn' : 'trackPositionChangeIn',
          params: { minutes },
        },
      };
    }

    case 'completed':
    default:
      return {
        primary: status.currentStop
          ? { key: 'trackPositionArrived', params: { stop: status.currentStop.name } }
          : { key: 'trackStatusCompleted' },
        secondary: null,
      };
  }
}

/**
 * The single-leg view, for cards that track one trip.
 *
 * Delegates to `computeJourneyStatus` so there is one implementation of the time
 * maths, and flattens the journey phases onto the older `TrackPhase`.
 */
export function computeBusStatus(track: ActiveTrack, now = new Date()): BusTrackStatus {
  const journey = computeJourneyStatus(track, now);
  if (trackLegs(track).length === 0) {
    return {
      phase: 'unknown',
      statusLabel: { key: 'trackStatusTracking' },
      countdown: { key: 'trackStatusMinutes', params: { count: 0 } },
      progress: 0,
      currentStop: null,
      nextStop: null,
      timeToNextStopMin: 0,
    };
  }
  const phase: TrackPhase =
    journey.phase === 'waiting'
      ? 'waiting'
      : journey.phase === 'completed'
        ? 'completed'
        : 'active';
  return {
    phase,
    statusLabel: journey.statusLabel,
    countdown: journey.countdown,
    progress: journey.progress,
    currentStop: journey.currentStop,
    nextStop: journey.nextStop,
    timeToNextStopMin: journey.timeToNextStopMin,
  };
}

/**
 * When a tracked itinerary stops being worth a countdown.
 *
 * The flat 4h TTL was sized for one bus; a journey with a 50-minute change can
 * outlive it and vanish mid-trip. Derived from the itinerary instead — half an
 * hour past the final arrival, so a late bus still shows — and clamped to 8h so
 * a malformed record cannot pin a row on screen indefinitely (09 §3.3).
 */
export function deriveTrackExpiry(
  legs: TrackedLeg[],
  searchDate: string | undefined,
  now = Date.now(),
): number {
  const usable = legs.filter((leg) => leg.stops?.length);
  if (usable.length === 0) {
    return now + ACTIVE_TRACK_TTL_MS;
  }
  const spans = legSpans(usable);
  // `end` is measured from the departure day, so the base has to be that day —
  // anchoring on today would shift a journey tracked for tomorrow by 24h.
  const arrival =
    departureDayStart(searchDate, new Date(now)) + spans[spans.length - 1].end * 60_000;
  // Floored, not just capped. The default search time is 00h00, so a rider can
  // and does track a bus that has already run — and a derived expiry in the past
  // meant `pruneTracking` deleted the row within 30s of it being created, with
  // no message. It now lives long enough to say "completed" and be dismissed.
  return Math.max(
    Math.min(arrival + TRACK_GRACE_MS, now + MAX_TRACK_TTL_MS),
    now + MIN_TRACK_TTL_MS,
  );
}

/**
 * Lift one persisted single-trip record into the multi-leg shape (09 §3.1).
 *
 * The contract here is that NOTHING is ever dropped. A subscriber losing their
 * pins on an app update is the exact failure the whole of 09 exists to prevent,
 * so a record that is already migrated passes through, and one that is neither
 * old-shaped nor new-shaped — corrupt, or written by a build we do not know —
 * is kept with an empty `legs` rather than filtered out. An empty leg list
 * renders as an unavailable pin the user can delete; a missing row reads as
 * data loss.
 *
 * Exported for the migration tests, which is the only way to assert on a
 * persisted blob without standing up AsyncStorage.
 */
export function liftTrackedRecord<T extends { legs?: unknown; transfers?: unknown }>(record: T): T {
  if (!record || typeof record !== 'object') {
    return record;
  }
  if (Array.isArray(record.legs)) {
    // Already migrated. Backfill `transfers` only if the writer omitted it.
    return Array.isArray(record.transfers) ? record : { ...record, transfers: [] };
  }

  const legacy = record as T & {
    tripId?: number;
    routeNumber?: string;
    origin?: string;
    destination?: string;
    stops?: TripStop[];
    nextDeparture?: string;
    estimatedArrival?: string;
  };
  const hasTrip = typeof legacy.tripId === 'number';

  return {
    ...record,
    legs: hasTrip
      ? [
          {
            tripId: legacy.tripId as number,
            routeNumber: legacy.routeNumber ?? '',
            origin: legacy.origin ?? '',
            destination: legacy.destination ?? '',
            // A pin never stored a departure/arrival, only the trip's own stop
            // list, so fall back to its ends rather than inventing times.
            start: legacy.nextDeparture ?? legacy.stops?.[0]?.time ?? '',
            end:
              legacy.estimatedArrival ??
              legacy.stops?.[(legacy.stops?.length ?? 1) - 1]?.time ??
              '',
            stops: legacy.stops ?? [],
          },
        ]
      : [],
    transfers: [],
  };
}

/** One leg, from a plain single-trip search result. */
export function tripAsTrackedLeg(trip: TransitSearchResult): TrackedLeg {
  const stops = trip.stops?.length
    ? trip.stops
    : [
        { name: trip.origin, time: trip.start },
        { name: trip.destination, time: trip.end },
      ];
  return {
    tripId: trip.id,
    routeNumber: trip.route,
    origin: trip.origin,
    destination: trip.destination,
    start: trip.start,
    end: trip.end,
    stops: withDayOffsets(stops),
    ...(trip.boarding ? { boardSequence: trip.boarding.sequence } : {}),
    ...(trip.alighting ? { alightSequence: trip.alighting.sequence } : {}),
  };
}

export function buildActiveTrackFromTrip(
  trip: TransitSearchResult,
  searchDay: string,
): Omit<ActiveTrack, 'id' | 'createdAt' | 'expiresAt'> {
  const today = localIsoDate();
  const leg = tripAsTrackedLeg(trip);
  return {
    tripId: trip.id,
    routeNumber: trip.route,
    origin: trip.origin,
    destination: trip.destination,
    searchDay,
    searchDate: today,
    legs: [leg],
    transfers: [],
    stops: leg.stops,
    nextDeparture: trip.start,
    estimatedArrival: trip.end,
  };
}

export const MAX_ACTIVE_TRACKS = 5;
export const ACTIVE_TRACK_TTL_MS = 4 * 60 * 60 * 1000;
/** Ceiling on a derived expiry — a long itinerary still has to end. */
export const MAX_TRACK_TTL_MS = 8 * 60 * 60 * 1000;
/** Kept past the final arrival, so a late bus does not drop off mid-trip. */
export const TRACK_GRACE_MS = 30 * 60 * 1000;
/**
 * Floor on a derived expiry. Tracking a trip that has already finished is a
 * legitimate thing to do by accident — the search defaults to 00h00 — and the
 * row has to outlive the 30s prune or it disappears with no explanation.
 */
export const MIN_TRACK_TTL_MS = 30 * 60 * 1000;
