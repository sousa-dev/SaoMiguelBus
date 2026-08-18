import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { searchTransitJourneys } from '@/lib/api';
import { journeyFromSearchResult } from '@/lib/journey-fallback';
import { hasOfflineCache, loadCachedBundle, offlineSearch } from '@/lib/offline-bundle';
import { offlineJourneySearchV2 } from '@/lib/offline-bundle-v2';
import { loadCachedBundleV2 } from '@/lib/offline-bundle-v2-storage';
import { useNetwork } from '@/lib/network-provider';
import { track } from '@/lib/analytics';
import { processTransitJourneys } from '@/lib/transit-results';
import { useTransitDataset } from '@/features/transit/hooks/useScheduleConfig';
import type { TransitDataset, TransitJourneySearch } from '@/lib/types';

export const FULL_DAY_START = '00h00';

/** Local calendar date as `YYYY-MM-DD` — never a UTC-parsed Date (see offline-search). */
function localIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function useOfflineCacheAvailable() {
  return useQuery({
    queryKey: ['transit', 'offline-cache'],
    queryFn: hasOfflineCache,
    staleTime: 60_000,
  });
}

export interface JourneySearchParams {
  origin: string;
  destination: string;
  /** Day TYPE — `weekday` | `saturday` | `sunday`. */
  day: string;
  start: string;
  /** The calendar date the day type stands for. Offline v2 is date-keyed. */
  isoDate?: string;
  maxTransfers: number;
  dataset: TransitDataset | null;
  isOnline: boolean;
}

/**
 * The cache key for one journeys search.
 *
 * Shared rather than inlined so that a non-render caller — following a pin — hits
 * the same entries the search screen already filled, instead of issuing its own
 * parallel requests for the same day.
 */
export function journeySearchQueryKey(params: JourneySearchParams) {
  return [
    'transit',
    'search',
    {
      origin: params.origin,
      destination: params.destination,
      day: params.day,
      isoDate: params.isoDate ?? null,
      start: params.start,
    },
    params.isOnline ? 'online' : 'offline',
    params.dataset ?? 'server',
    params.maxTransfers,
  ] as const;
}

/**
 * Run one journeys search, online or off.
 *
 * Extracted from the hook below unchanged so that it has exactly one
 * implementation: the online call with its `/journeys` → `/search` degradation,
 * the v2 bundle, then the frozen v1 bundle. Following a pinned itinerary needs
 * the same answer outside a render, and a rider mid-journey is the likeliest
 * person in the app to be offline.
 *
 * `probeEarlier` is the search screen's whole-day re-query and is off by default:
 * a caller that already searched from 00h00 has nothing to learn from it.
 */
export async function fetchJourneySearch(
  params: JourneySearchParams & {
    probeEarlier?: boolean;
    source?: 'search' | 'follow_pin';
  },
): Promise<TransitJourneySearch> {
  const { origin, destination, day, start, dataset, maxTransfers, isOnline } = params;
  const source = params.source ?? 'search';

  if (isOnline) {
    const result = await searchTransitJourneys({
      origin,
      destination,
      day,
      start,
      dataset,
      maxTransfers,
    });
    // One extra request, only on an otherwise-dead screen (same trade
    // `transfersAvailable` makes): tells the empty state whether nothing
    // runs after `start`, or nothing runs between these stops at all.
    let earlierJourneysAvailable: number | undefined;
    if (params.probeEarlier && result.journeys.length === 0 && start !== FULL_DAY_START) {
      const wholeDay = await searchTransitJourneys({
        origin,
        destination,
        day,
        start: FULL_DAY_START,
        dataset,
        maxTransfers,
      });
      earlierJourneysAvailable = wholeDay.journeys.length;
    }
    track('transit', 'search', {
      origin,
      destination,
      day_type: day,
      start_time: start,
      results_count: result.journeys.length,
      transfer_results_count: result.journeys.filter((j) => j.transfers > 0).length,
      max_transfers: maxTransfers,
      transfers_available: result.transfersAvailable ?? null,
      dataset: dataset ?? 'server',
      source,
    });
    return { ...result, earlierJourneysAvailable };
  }

  // The schema-versioned bundle answers "does this trip run on THIS ISO
  // date?", which the v1 weekday enum cannot (98 B0). Fall back to v1 only
  // when there is no v2 copy on disk.
  const v2 = await loadCachedBundleV2();
  if (v2) {
    const isoDate = params.isoDate ?? localIsoDate(new Date());
    const result = offlineJourneySearchV2(v2, {
      origin,
      destination,
      isoDate,
      start,
      maxTransfers,
    });
    // Offline must agree with online on what "no routes" means, so it
    // gets the same whole-day re-query rather than silently having no
    // answer for the distinction.
    let earlierJourneysAvailable: number | undefined;
    if (params.probeEarlier && result.journeys.length === 0 && start !== FULL_DAY_START) {
      const wholeDay = offlineJourneySearchV2(v2, {
        origin,
        destination,
        isoDate,
        start: FULL_DAY_START,
        maxTransfers,
      });
      earlierJourneysAvailable = wholeDay.journeys.length;
    }
    track('transit', 'offline_search', {
      origin,
      destination,
      results_count: result.journeys.length,
      transfer_results_count: result.journeys.filter((j) => j.transfers > 0).length,
      max_transfers: maxTransfers,
      transfers_available: result.transfersAvailable ?? null,
      schema: 2,
      source,
    });
    return { ...result, earlierJourneysAvailable };
  }

  const bundle = await loadCachedBundle();
  if (!bundle) {
    return { journeys: [], maxTransfers };
  }
  // v1 is FROZEN for already-installed builds (`lib/offline-search.ts`), so
  // it stays direct-only. Its rows still render, as one-leg journeys — a
  // rider on an old bundle sees fewer options, never wrong ones.
  const results = offlineSearch(bundle, { origin, destination, day });
  track('transit', 'offline_search', {
    origin,
    destination,
    results_count: results.length,
    transfer_results_count: 0,
    max_transfers: 0,
    schema: 1,
    source,
  });
  // v1 knows nothing about transfers, so there is no honest count to offer
  // and the retry prompt stays hidden rather than guessing.
  return { journeys: results.map(journeyFromSearchResult), maxTransfers: 0 };
}

export function useTransitSearchWithOffline(params: {
  origin: string;
  destination: string;
  day: string;
  userTime: string;
  enabled: boolean;
  /** ISO date the user picked; offline eligibility is per-date, not per-day-type. */
  isoDate?: string;
  /**
   * Allow itineraries with a change of bus. ON by default — a rider who has not
   * expressed a preference is better served by more ways to get there.
   */
  allowTransfers?: boolean;
}) {
  const { isOnline, hasOfflineBundle } = useNetwork();
  const dataset = useTransitDataset();
  const canSearch = Boolean(params.origin && params.destination);
  const maxTransfers = params.allowTransfers === false ? 0 : 1;
  // The rider's own picker, not the clock — do not bucket this the way
  // `departuresStartTime` buckets "now" (see 04 §Fix note 1).
  const start = params.userTime || FULL_DAY_START;

  const searchKey: JourneySearchParams = {
    origin: params.origin,
    destination: params.destination,
    day: params.day,
    start,
    ...(params.isoDate !== undefined ? { isoDate: params.isoDate } : {}),
    maxTransfers,
    dataset,
    isOnline,
  };

  const rawQuery = useQuery({
    // The dataset belongs in the key even outside preview: without it a screen
    // left open across midnight keeps serving the previous network (98 §4 gap).
    queryKey: journeySearchQueryKey(searchKey),
    queryFn: (): Promise<TransitJourneySearch> =>
      fetchJourneySearch({ ...searchKey, probeEarlier: true }),
    enabled: params.enabled && canSearch && (isOnline || hasOfflineBundle),
    networkMode: 'always',
  });

  const data = useMemo(
    () =>
      processTransitJourneys(rawQuery.data?.journeys ?? [], {
        userTime: params.userTime,
      }),
    [rawQuery.data, params.userTime],
  );

  return {
    ...rawQuery,
    data,
    /**
     * How many itineraries a change of bus WOULD find, when this search asked
     * for one bus only and found none. `undefined` whenever there is no honest
     * number — the prompt must never offer a retry that turns up nothing.
     */
    transfersAvailable: rawQuery.data?.transfersAvailable,
    /**
     * How many itineraries the whole day WOULD find, when this search asked
     * for a time after midnight and found none. `undefined` whenever there is
     * no honest number — v1 offline has no time filter to distinguish against.
     */
    earlierJourneysAvailable: rawQuery.data?.earlierJourneysAvailable,
  };
}

export function useCanSearchOffline() {
  const { isOnline, hasOfflineBundle } = useNetwork();
  return isOnline || hasOfflineBundle;
}
