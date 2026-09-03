/**
 * The one shape both platforms render, built in one place.
 *
 * Deliberately flat, small and already-rounded: it crosses a JS->native
 * bridge on Android and an APNs payload on iOS, where ActivityKit refuses
 * anything over 4KB. Nothing here is localized — copy lives in
 * `locales/*.json` and reaches native as templates (`liveTripStrings`), so a
 * translation change never means a native release.
 */
import { legSpans, nowMinutes } from '@/lib/bus-tracking';
import type { ActiveTrack } from '@/lib/profile-store';
import type { TransitTripLive } from '@/lib/types';

export interface LiveTripSnapshot {
  v: 1;
  state: 'waiting' | 'riding' | 'arriving' | 'completed' | 'stale';
  nextStopName: string | null;
  minutesToNextStop: number | null;
  delayMinutes: number | null;
  progress: number;
  updatedAtEpochMs: number;
}

export interface LiveTripStrings {
  /** The APP locale (in-app picker), not the device locale. */
  locale: string;
  title: string;
  waiting: string;
  riding: string;
  arriving: string;
  late: string;
  onTime: string;
  stale: string;
  completed: string;
}

export function liveTripSnapshotFrom(
  track: ActiveTrack,
  legIndex: number,
  row: TransitTripLive | null,
  now: Date,
): LiveTripSnapshot {
  const legs = (track.legs ?? []).filter((leg) => leg.stops?.length);
  const spans = legSpans(legs);
  const span = spans[legIndex];
  const current = nowMinutes(track.searchDate, now);

  const phase: 'waiting' | 'riding' | 'completed' =
    !span || current < span.start ? 'waiting' : current > span.end ? 'completed' : 'riding';

  const spanMinutes = span ? span.end - span.start : 0;
  const progress =
    phase === 'completed'
      ? 1
      : phase === 'waiting' || spanMinutes <= 0
        ? 0
        : Math.min(1, Math.max(0, (current - span.start) / spanMinutes));

  const vehicle = row?.state === 'live' ? row.vehicle : null;
  // A stale reading is a real position with an unknown ETA -- the server
  // sends an empty `upcomingStops` for it, so there is nothing honest to
  // count down from.
  const trusted = vehicle && !vehicle.stale ? vehicle : null;
  const minutesToNextStop = trusted?.nextStop?.dueInMinutes ?? null;

  let state: LiveTripSnapshot['state'] = phase;
  if (phase === 'riding' && vehicle?.stale) {
    state = 'stale';
  } else if (phase === 'riding' && minutesToNextStop != null && minutesToNextStop <= 1) {
    state = 'arriving';
  }

  return {
    v: 1,
    state,
    nextStopName: trusted?.nextStop?.name ?? null,
    minutesToNextStop,
    // Delay lives on the fleet list, not the detail, so it survives even when
    // the detail read that would give a stop ETA failed (the "stale" case).
    delayMinutes:
      typeof vehicle?.delaySeconds === 'number' ? Math.round(vehicle.delaySeconds / 60) : null,
    progress,
    updatedAtEpochMs: now.getTime(),
  };
}

/** Localized once, per trip. `t` is i18next's `t`; `locale` is the app's own. */
export function liveTripStrings(t: (key: string) => string, locale: string): LiveTripStrings {
  return {
    locale,
    title: t('liveTripTitle'),
    waiting: t('liveTripWaiting'),
    riding: t('liveTripRiding'),
    arriving: t('liveTripArriving'),
    late: t('liveTripLate'),
    onTime: t('liveTripOnTime'),
    stale: t('liveTripStale'),
    completed: t('liveTripCompleted'),
  };
}
