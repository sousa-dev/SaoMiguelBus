/**
 * Recover a trip from the cached search results.
 *
 * `GET /api/v3/transit/trips/{id}` resolves its dataset from the server's own
 * date and ignores `?dataset=`, so while previewing — where results come from the
 * NOT-yet-active network — every trip detail 404s. The search result the user
 * just tapped already carries everything `TripDetail` renders, so falling back to
 * it beats an error screen.
 *
 * This also covers a trip that has aged out of the active dataset, and a detail
 * request that simply failed.
 */

import type { TransitSearchResult } from '@/lib/types';

/**
 * The trip with this id from any cached search, or null.
 *
 * Later caches win: the most recent search is the one the user came from, and a
 * trip id can legitimately appear in both networks' results while previewing.
 */
export function findCachedTrip(
  caches: (TransitSearchResult[] | undefined)[],
  id: number,
): TransitSearchResult | null {
  if (!Number.isFinite(id)) {
    return null;
  }
  let found: TransitSearchResult | null = null;
  for (const results of caches) {
    if (!Array.isArray(results)) {
      continue;
    }
    for (const trip of results) {
      if (trip?.id === id) {
        found = trip;
      }
    }
  }
  return found;
}
