import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { searchTransit } from '@/lib/api';
import { hasOfflineCache, loadCachedBundle, offlineSearch } from '@/lib/offline-bundle';
import { useNetwork } from '@/lib/network-provider';
import { track } from '@/lib/analytics';
import { processTransitResults } from '@/lib/transit-results';
import type { TransitSearchResult } from '@/lib/types';

const FULL_DAY_START = '00h00';

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
}) {
  const { isOnline, hasOfflineBundle } = useNetwork();
  const canSearch = Boolean(params.origin && params.destination);

  const rawQuery = useQuery({
    queryKey: [
      'transit',
      'search',
      { origin: params.origin, destination: params.destination, day: params.day },
      isOnline ? 'online' : 'offline',
    ],
    queryFn: async (): Promise<TransitSearchResult[]> => {
      if (isOnline) {
        const results = await searchTransit({
          origin: params.origin,
          destination: params.destination,
          day: params.day,
          start: FULL_DAY_START,
        });
        track('transit', 'search', {
          origin: params.origin,
          destination: params.destination,
          day_type: params.day,
          start_time: FULL_DAY_START,
          results_count: results.length,
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
