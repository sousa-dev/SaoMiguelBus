/**
 * Present one ride leg as a `TransitSearchResult`.
 *
 * Tracking, sharing, pinning and voting are all per-BUS operations that already
 * work, and every one of them takes a `TransitSearchResult`. A leg carries the
 * same facts under different names, so adapting is strictly better than
 * widening `ActiveTrack`, `PinnedRoute`, `TrackButton`, `ShareTripButton` and
 * the vote mutation to understand journeys.
 *
 * That adapter remains the right tool for per-leg SHARING and voting, which are
 * genuinely about one bus. It is no longer the whole story for pinning and
 * tracking: `journeyAsPinnedRoute` below builds a whole-itinerary record, since
 * pinning half a two-bus journey leaves the rider to re-derive the change
 * themselves (09 §2 Gap B).
 */

import { withDayOffsets } from '@/lib/bus-tracking';
import type { PinnedRoute, TrackedLeg, TrackedTransfer } from '@/lib/profile-store';
import type {
  TransitDataset,
  TransitJourney,
  TransitRideLeg,
  TransitSearchResult,
} from '@/lib/types';
import { isRideLeg, isTransferLeg, journeyRideLegs } from '@/lib/types';

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

/** One ride leg as the trimmed record the store persists. */
export function rideLegAsTrackedLeg(leg: TransitRideLeg, format: (route: string) => string): TrackedLeg {
  return {
    tripId: leg.tripId,
    routeNumber: format(leg.route),
    // The rider's own board and alight, not where the bus starts and finishes.
    origin: leg.board.name,
    destination: leg.alight.name,
    start: leg.board.time,
    end: leg.alight.time,
    // `board.dayOffset` seeds the day, so a leg boarded after midnight is not
    // read as one departing that morning (09 §3.3).
    stops: withDayOffsets(leg.stops, leg.board.dayOffset ?? 0),
    // The sequences the server chose, so nothing is re-matched by name (98 B7).
    boardSequence: leg.board.sequence,
    alightSequence: leg.alight.sequence,
  };
}

/**
 * A whole itinerary as a pin (09 §3.2).
 *
 * Endpoints come from the LEGS, never from the search terms: on AzoresBus a
 * search for "Capelas" resolves to a village area covering several poles, and
 * storing the query would lose which pole the itinerary actually used.
 */
export function journeyAsPinnedRoute(
  journey: TransitJourney,
  searchDay: string,
  dataset: TransitDataset | null,
  format: (route: string) => string,
): Omit<PinnedRoute, 'id' | 'pinnedAt'> {
  const rides = journeyRideLegs(journey);
  const legs = rides.map((leg) => rideLegAsTrackedLeg(leg, format));
  const transfers: TrackedTransfer[] = journey.legs.filter(isTransferLeg).map((leg) => ({
    at: leg.at,
    from: leg.from,
    waitMinutes: leg.waitMinutes,
    walkMinutes: leg.walkMinutes,
    tight: leg.tight,
  }));

  const firstLeg = legs[0];
  const lastLeg = legs[legs.length - 1];

  return {
    journeyId: journey.id,
    ...(dataset ? { dataset } : {}),
    routeNumber: journeyRouteLabel(journey, format),
    origin: firstLeg?.origin ?? '',
    destination: lastLeg?.destination ?? '',
    searchDay,
    legs,
    transfers,
    // Legacy mirrors, so a build that still reads the flat shape keeps working
    // for the one release the deprecated fields are kept.
    tripId: firstLeg?.tripId ?? 0,
    stops: firstLeg?.stops ?? [],
  };
}

/**
 * The same itinerary as a live track. Shares `journeyAsPinnedRoute`'s shape —
 * the two records only differ in their timing fields.
 */
export function journeyAsActiveTrack(
  journey: TransitJourney,
  searchDay: string,
  dataset: TransitDataset | null,
  format: (route: string) => string,
  searchDate = new Date().toISOString().slice(0, 10),
) {
  const pin = journeyAsPinnedRoute(journey, searchDay, dataset, format);
  return {
    ...pin,
    searchDate,
    nextDeparture: pin.legs[0]?.start ?? journey.start,
    estimatedArrival: pin.legs[pin.legs.length - 1]?.end ?? journey.end,
  };
}

/** Whether the per-leg action row is still worth rendering (09 §3.4). */
export function hasMultipleRideLegs(journey: TransitJourney): boolean {
  return journey.legs.filter(isRideLeg).length > 1;
}
