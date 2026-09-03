/**
 * Pure trip-tracking half of the live bar: which track, which leg, when it
 * ends. Deliberately free of anything that imports `expo` at module scope
 * (`./native` does, to reach `requireOptionalNativeModule`) — that import
 * bootstraps RN/Expo runtime globals like `__DEV__` that plain `node:test`
 * does not define, exactly the trap `lib/notifications/exact-alarms.ts`
 * avoids by staying out of anything pure-tested. `controller.ts` is what
 * wires this to the native bridge; this file must never import it back.
 */
import { AZORESBUS_TRACKING_POLL_MS } from '@/features/azoresbus/lib/trackingPollInterval';
import { currentLegIndex, liveTripLegWindows } from '@/features/transit/lib/live-trip-legs';
import { liveTripSnapshotFrom, type LiveTripSnapshot } from '@/features/transit/lib/live-trip-state';
import { departureDayStart, nowMinutes } from '@/lib/bus-tracking';
import type { ActiveTrack } from '@/lib/profile-store';
import type { TransitTripLive } from '@/lib/types';

import type { LiveTripDescriptor, LiveTripStrings } from './types';

export interface LiveTripStartPlan {
  descriptor: LiveTripDescriptor;
  strings: LiveTripStrings;
}

/**
 * Returns `null` whenever there is nothing honest to show — a non-AzoresBus
 * track (the server has no journey id to attribute a bus to), a leg with no
 * `tripId` (an old pin from before the dataset migration), or an itinerary
 * that has already finished.
 */
export function buildLiveTripStart(
  track: ActiveTrack,
  strings: LiveTripStrings,
  apiBase: string,
  islandKey: string,
  sessionId: string,
  now: Date,
): LiveTripStartPlan | null {
  if (track.dataset !== 'azoresbus') {
    return null;
  }
  const windows = liveTripLegWindows(track);
  if (windows.length === 0) {
    return null;
  }
  const current = nowMinutes(track.searchDate, now);
  if (current > windows[windows.length - 1].endMinutes) {
    return null;
  }

  const legIndex = currentLegIndex(windows, current);
  const legs = (track.legs ?? []).filter((leg) => leg.stops?.length);
  const leg = legs[legIndex];
  if (!leg) {
    return null;
  }

  const departureDayStartMs = departureDayStart(track.searchDate, now);
  const lastWindow = windows[windows.length - 1];

  return {
    descriptor: {
      activityKey: track.id,
      apiBase,
      islandKey,
      sessionId,
      legs: windows,
      departureDayStartMs,
      endsAtEpochMs: departureDayStartMs + lastWindow.endMinutes * 60_000,
      deepLink: `saomiguelhub:///(tabs)/transit/${leg.tripId}`,
      route: leg.routeNumber,
      destination: leg.destination,
      eta: leg.end,
      intervalMs: AZORESBUS_TRACKING_POLL_MS,
    },
    strings,
  };
}

/** The initial snapshot the bar shows before its first poll or push lands. */
export function initialLiveTripSnapshot(track: ActiveTrack, now: Date): LiveTripSnapshot {
  const windows = liveTripLegWindows(track);
  const current = nowMinutes(track.searchDate, now);
  const legIndex = currentLegIndex(windows, current);
  const emptyRow: TransitTripLive | null = null;
  return liveTripSnapshotFrom(track, legIndex, emptyRow, now);
}
