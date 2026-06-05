import { needsRouteConfirmation, timeStringToMinutes } from '@/lib/transit-format';
import type { TransitSearchResult } from '@/lib/types';

const NEAR_DEPARTURE_DEDUP_MINUTES = 3;

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

/** Normalize vote percents and apply legacy near-departure dedup only. */
export function processTransitResults(results: TransitSearchResult[]): TransitSearchResult[] {
  const normalized = (results ?? []).map(normalizeSearchResult);
  return dedupNearDepartures(normalized);
}
