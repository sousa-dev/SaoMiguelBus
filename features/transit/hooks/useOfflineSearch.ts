import { useQuery } from '@tanstack/react-query';

import { searchTransit } from '@/lib/api';
import { hasOfflineCache, loadCachedBundle, offlineSearch } from '@/lib/offline-bundle';
import { useNetwork } from '@/lib/network-provider';
import { track } from '@/lib/analytics';
import type { TransitSearchResult } from '@/lib/types';

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
  start: string;
  enabled: boolean;
}) {
  // `hasOfflineBundle` is premium-gated in NetworkProvider — non-premium users
  // get no offline capability even with a cached bundle present.
  const { isOnline, hasOfflineBundle } = useNetwork();
  const canSearch = Boolean(params.origin && params.destination);

  return useQuery({
    queryKey: ['transit', 'search', params, isOnline ? 'online' : 'offline'],
    queryFn: async (): Promise<TransitSearchResult[]> => {
      if (isOnline) {
        const results = await searchTransit({
          origin: params.origin,
          destination: params.destination,
          day: params.day,
          start: params.start,
        });
        track('transit', 'search', {
          origin: params.origin,
          destination: params.destination,
          day_type: params.day,
          start_time: params.start,
          results_count: results.length,
        });
        return results;
      }
      const bundle = await loadCachedBundle();
      if (!bundle) {
        return [];
      }
      const results = offlineSearch(bundle, params);
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
}

export function useCanSearchOffline() {
  const { isOnline, hasOfflineBundle } = useNetwork();
  return isOnline || hasOfflineBundle;
}
