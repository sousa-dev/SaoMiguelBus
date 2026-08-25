import { extractTripSegment, needsRouteConfirmation, timeStringToMinutes } from '@/lib/transit-format';
import { journeyRideLegs, type TransitJourney, type TransitSearchResult } from '@/lib/types';

const NEAR_DEPARTURE_DEDUP_MINUTES = 3;

export type TransitProcessContext = {
  origin: string;
  destination: string;
  userTime: string;
};

export function normalizeSearchResult(row: TransitSearchResult): TransitSearchResult {
  return {
    ...row,
    likesPercent: row.likesPercent ?? 0,
    dislikesPercent: row.dislikesPercent ?? 0,
  };
}

/** Mirror webapp createRouteDiv: prefer higher-confidence trips within 3 minutes. */
function dedupNearDepartures(results: TransitSearchResult[]): TransitSearchResult[] {
  const kept: TransitSearchResult[] = [];

  for (const current of results) {
    const lastKept = kept[kept.length - 1];
    if (!lastKept) {
      kept.push(current);
      continue;
    }

    const timeDifference = Math.abs(
      timeStringToMinutes(current.start) - timeStringToMinutes(lastKept.start),
    );

    if (timeDifference >= NEAR_DEPARTURE_DEDUP_MINUTES) {
      kept.push(current);
      continue;
    }

    const currentNeedsConfirmation = needsRouteConfirmation(current.likesPercent);
    const lastNeedsConfirmation = needsRouteConfirmation(lastKept.likesPercent);

    if (currentNeedsConfirmation && !lastNeedsConfirmation) {
      continue;
    }
    if (!currentNeedsConfirmation && lastNeedsConfirmation) {
      kept[kept.length - 1] = current;
      continue;
    }
    // Both need confirmation or both do not — keep the first.
  }

  return kept;
}

function reorderByUserTime(results: TransitSearchResult[], userTime: string): TransitSearchResult[] {
  const threshold = timeStringToMinutes(userTime);
  const upcoming: TransitSearchResult[] = [];
  const earlier: TransitSearchResult[] = [];

  for (const trip of results) {
    const departure = timeStringToMinutes(trip.start);
    if (departure >= threshold) {
      upcoming.push(trip);
    } else {
      earlier.push(trip);
    }
  }

  const sortByStart = (a: TransitSearchResult, b: TransitSearchResult) =>
    timeStringToMinutes(a.start) - timeStringToMinutes(b.start);

  upcoming.sort(sortByStart);
  earlier.sort(sortByStart);
  return [...upcoming, ...earlier];
}

/** Normalize, trim O/D segment, dedup near departures, reorder by user time. */
export function processTransitResults(
  results: TransitSearchResult[],
  ctx: TransitProcessContext,
): TransitSearchResult[] {
  const segmented = (results ?? [])
    .map(normalizeSearchResult)
    .map((trip) => extractTripSegment(trip, ctx.origin, ctx.destination))
    .filter((trip): trip is TransitSearchResult => trip !== null);

  const deduped = dedupNearDepartures(segmented);
  return reorderByUserTime(deduped, ctx.userTime);
}

// --- Journeys --- //

/**
 * Same two rules as the trip path, on whole itineraries.
 *
 * Deliberately NOT `extractTripSegment`: each ride leg arrives already trimmed
 * to board..alight by the side that chose the pair, and re-deriving it here by
 * name would throw away exactly the pair the server just selected (98 B7) — and
 * on a two-leg journey it has no origin/destination to match the middle leg
 * against anyway.
 *
 * Direct journeys are never deduped against journeys with a change: two buses
 * leaving three minutes apart are not near-duplicates when one of them needs a
 * transfer, and collapsing them would hide the only option a rider has.
 */
export function processTransitJourneys(
  journeys: TransitJourney[],
  ctx: Pick<TransitProcessContext, 'userTime'>,
): TransitJourney[] {
  const deduped = dedupNearDepartingJourneys(journeys ?? []);
  return reorderJourneysByUserTime(deduped, ctx.userTime);
}

/** Confidence of the itinerary is the confidence of its least-confident bus. */
function journeyLikesPercent(journey: TransitJourney): number {
  const rides = journeyRideLegs(journey);
  if (rides.length === 0) {
    return 0;
  }
  return Math.min(...rides.map((leg) => leg.likesPercent));
}

function dedupNearDepartingJourneys(journeys: TransitJourney[]): TransitJourney[] {
  const kept: TransitJourney[] = [];

  for (const current of journeys) {
    const lastKept = kept[kept.length - 1];
    if (!lastKept) {
      kept.push(current);
      continue;
    }

    const sameShape = lastKept.transfers === current.transfers;
    const timeDifference = Math.abs(
      timeStringToMinutes(current.start) - timeStringToMinutes(lastKept.start),
    );

    if (!sameShape || timeDifference >= NEAR_DEPARTURE_DEDUP_MINUTES) {
      kept.push(current);
      continue;
    }

    const currentNeedsConfirmation = needsRouteConfirmation(journeyLikesPercent(current));
    const lastNeedsConfirmation = needsRouteConfirmation(journeyLikesPercent(lastKept));

    if (currentNeedsConfirmation && !lastNeedsConfirmation) {
      continue;
    }
    if (!currentNeedsConfirmation && lastNeedsConfirmation) {
      kept[kept.length - 1] = current;
      continue;
    }
    // Both need confirmation or both do not — keep the first.
  }

  return kept;
}

function reorderJourneysByUserTime(
  journeys: TransitJourney[],
  userTime: string,
): TransitJourney[] {
  const threshold = timeStringToMinutes(userTime);
  const upcoming: TransitJourney[] = [];
  const earlier: TransitJourney[] = [];

  for (const journey of journeys) {
    if (timeStringToMinutes(journey.start) >= threshold) {
      upcoming.push(journey);
    } else {
      earlier.push(journey);
    }
  }

  const byStart = (a: TransitJourney, b: TransitJourney) =>
    timeStringToMinutes(a.start) - timeStringToMinutes(b.start) ||
    timeStringToMinutes(a.end) - timeStringToMinutes(b.end) ||
    a.transfers - b.transfers;

  upcoming.sort(byStart);
  earlier.sort(byStart);
  return [...upcoming, ...earlier];
}
