import { extractTripSegment, needsRouteConfirmation, timeStringToMinutes } from '@/lib/transit-format';
import type { TransitSearchResult } from '@/lib/types';

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
