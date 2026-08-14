import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { searchTransit } from '@/lib/api';
import { hasOfflineCache, loadCachedBundle, offlineSearch } from '@/lib/offline-bundle';
import { offlineSearchV2 } from '@/lib/offline-bundle-v2';
import { loadCachedBundleV2 } from '@/lib/offline-bundle-v2-storage';
import { useNetwork } from '@/lib/network-provider';
import { track } from '@/lib/analytics';
import { processTransitResults } from '@/lib/transit-results';
import { useTransitDataset } from '@/features/transit/hooks/useScheduleConfig';
import type { TransitSearchResult } from '@/lib/types';

const FULL_DAY_START = '00h00';

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

export function useTransitSearchWithOffline(params: {
  origin: string;
  destination: string;
  day: string;
  userTime: string;
  enabled: boolean;
  /** ISO date the user picked; offline eligibility is per-date, not per-day-type. */
  isoDate?: string;
}) {
  const { isOnline, hasOfflineBundle } = useNetwork();
  const dataset = useTransitDataset();
  const canSearch = Boolean(params.origin && params.destination);

  const rawQuery = useQuery({
    // The dataset belongs in the key even outside preview: without it a screen
    // left open across midnight keeps serving the previous network (98 §4 gap).
    queryKey: [
      'transit',
      'search',
      {
        origin: params.origin,
        destination: params.destination,
        day: params.day,
        isoDate: params.isoDate ?? null,
      },
      isOnline ? 'online' : 'offline',
      dataset ?? 'server',
    ],
    queryFn: async (): Promise<TransitSearchResult[]> => {
      if (isOnline) {
        const results = await searchTransit({
          origin: params.origin,
          destination: params.destination,
          day: params.day,
          start: FULL_DAY_START,
          dataset,
        });
        track('transit', 'search', {
          origin: params.origin,
          destination: params.destination,
          day_type: params.day,
          start_time: FULL_DAY_START,
          results_count: results.length,
          dataset: dataset ?? 'server',
        });
        return results;
      }
      // The schema-versioned bundle answers "does this trip run on THIS ISO
      // date?", which the v1 weekday enum cannot (98 B0). Fall back to v1 only
      // when there is no v2 copy on disk.
      const v2 = await loadCachedBundleV2();
      if (v2) {
        const results = offlineSearchV2(v2, {
          origin: params.origin,
          destination: params.destination,
          isoDate: params.isoDate ?? localIsoDate(new Date()),
        });
        track('transit', 'offline_search', {
          origin: params.origin,
          destination: params.destination,
          results_count: results.length,
          schema: 2,
        });
        return results;
      }

      const bundle = await loadCachedBundle();
      if (!bundle) {
        return [];
      }
      const results = offlineSearch(bundle, {
        origin: params.origin,
        destination: params.destination,
        day: params.day,
      });
      track('transit', 'offline_search', {
        origin: params.origin,
        destination: params.destination,
        results_count: results.length,
        schema: 1,
      });
      return results;
    },
    enabled: params.enabled && canSearch && (isOnline || hasOfflineBundle),
    networkMode: 'always',
  });

  const data = useMemo(
    () =>
      processTransitResults(rawQuery.data ?? [], {
        origin: params.origin,
        destination: params.destination,
        userTime: params.userTime,
      }),
    [rawQuery.data, params.origin, params.destination, params.userTime],
  );

  return {
    ...rawQuery,
    data,
  };
}

export function useCanSearchOffline() {
  const { isOnline, hasOfflineBundle } = useNetwork();
  return isOnline || hasOfflineBundle;
}
