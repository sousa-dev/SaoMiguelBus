import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { searchTransit } from '@/lib/api';
import {
  hasOfflineCache,
  loadCachedBundle,
  offlineSearch,
  refreshOfflineBundle,
} from '@/lib/offline-bundle';
import { useNetworkStatus } from '@/lib/network-status';
import { track } from '@/lib/analytics';
import type { TransitSearchResult } from '@/lib/types';

export function useOfflineBundleSync(enabled: boolean) {
  const { isOnline } = useNetworkStatus();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !isOnline) {
      return;
    }
    void refreshOfflineBundle().then(() => {
      queryClient.invalidateQueries({ queryKey: ['transit', 'offline-cache'] });
    });
  }, [enabled, isOnline, queryClient]);
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
  start: string;
  enabled: boolean;
}) {
  const { isOnline } = useNetworkStatus();
  const canSearch = Boolean(params.origin && params.destination);
  const cacheQuery = useOfflineCacheAvailable();

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
      const bundle = (await loadCachedBundle()) ?? (await refreshOfflineBundle());
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
    enabled: params.enabled && canSearch && (isOnline || Boolean(cacheQuery.data)),
    networkMode: 'always',
  });
}

export function useCanSearchOffline() {
  const { isOnline } = useNetworkStatus();
  const cache = useOfflineCacheAvailable();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void hasOfflineCache().then(setReady);
  }, [cache.data]);

  return isOnline || ready;
}
