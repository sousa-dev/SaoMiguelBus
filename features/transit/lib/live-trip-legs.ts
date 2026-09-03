/**
 * Which leg is the live bar talking about?
 *
 * Native cannot re-run `computeJourneyStatus` — the Kotlin service and the
 * SwiftUI widget have no JS, and the server's push task has no client state.
 * So the itinerary is flattened once into absolute-minute windows, and all
 * three pick the current leg with clock arithmetic alone. That is exactly the
 * rule `computeJourneyStatus` applies when it has no live data, so they agree.
 */
import { departureDayStart, legSpans } from '@/lib/bus-tracking';
import type { ActiveTrack } from '@/lib/profile-store';

export interface LiveTripLegWindow {
  tripId: number;
  /** Minutes from the itinerary's departure-day midnight, day offsets folded in. */
  startMinutes: number;
  endMinutes: number;
}

export function liveTripLegWindows(track: ActiveTrack): LiveTripLegWindow[] {
  const legs = (track.legs ?? []).filter((leg) => leg.stops?.length);
  const spans = legSpans(legs);
  return legs.flatMap((leg, i) =>
    typeof leg.tripId === 'number'
      ? [{ tripId: leg.tripId, startMinutes: spans[i].start, endMinutes: spans[i].end }]
      : [],
  );
}

/** The leg being ridden, else the one about to be boarded, else the last. */
export function currentLegIndex(windows: LiveTripLegWindow[], minutes: number): number {
  if (windows.length === 0) {
    return 0;
  }
  for (let i = 0; i < windows.length; i++) {
    if (minutes <= windows[i].endMinutes) {
      return i;
    }
  }
  return windows.length - 1;
}

export { departureDayStart };
