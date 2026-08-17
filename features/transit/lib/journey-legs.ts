/**
 * Present one ride leg as a `TransitSearchResult`.
 *
 * Tracking, sharing, pinning and voting are all per-BUS operations that already
 * work, and every one of them takes a `TransitSearchResult`. A leg carries the
 * same facts under different names, so adapting is strictly better than
 * widening `ActiveTrack`, `PinnedRoute`, `TrackButton`, `ShareTripButton` and
 * the vote mutation to understand journeys.
 *
 * The consequence is deliberate and worth stating: on a two-bus itinerary the
 * rider tracks or shares ONE leg, not the whole journey. Journey-level tracking
 * needs `lib/profile-store.ts` to grow a multi-leg shape, which is separate work.
 */

import type { TransitJourney, TransitRideLeg, TransitSearchResult } from '@/lib/types';

export function rideLegAsTrip(
  leg: TransitRideLeg,
  journey: Pick<TransitJourney, 'typeOfDay'>,
): TransitSearchResult {
  return {
    id: leg.tripId,
    route: leg.route,
    origin: leg.board.name,
    destination: leg.alight.name,
    start: leg.board.time,
    end: leg.alight.time,
    typeOfDay: journey.typeOfDay,
    likesPercent: leg.likesPercent,
    dislikesPercent: leg.dislikesPercent,
    information: leg.information,
    stops: leg.stops,
    ...(leg.boarding ? { boarding: leg.boarding } : {}),
    ...(leg.alighting ? { alighting: leg.alighting } : {}),
    // The server already trimmed the leg to board..alight, so the positions are
    // the ones it chose rather than any re-matched by name (98 B7).
    segmentExact: true,
  };
}

/** `"315 → 110"`, or just `"315"` when direct. Route codes keep their `C` prefix. */
export function journeyRouteLabel(
  journey: TransitJourney,
  format: (route: string) => string,
): string {
  return journey.legs
    .filter((leg): leg is TransitRideLeg => leg.kind === 'ride')
    .map((leg) => format(leg.route))
    .join(' → ');
}
