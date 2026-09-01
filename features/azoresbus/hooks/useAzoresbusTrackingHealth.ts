import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { staticIslandConfig } from '@/config/island';
import { fetchAzoresbusTrackingHealth } from '@/lib/api';

export { isAzoresbusTrackingAvailable } from '@/features/azoresbus/lib/trackingHealth';

const DEFAULT_STALE_MS = 30_000;

export function azoresbusTrackingHealthQueryKey(
  islandKey: string = staticIslandConfig.islandKey,
) {
  return ['azoresbus', 'v1', 'tracking-health', islandKey] as const;
}

type HealthQueryOptions = {
  enabled?: boolean;
};

export function useAzoresbusTrackingHealth(options: HealthQueryOptions = {}) {
  const { enabled = true } = options;
  const queryClient = useQueryClient();
  const queryKey = azoresbusTrackingHealthQueryKey();

  const query = useQuery({
    queryKey,
    queryFn: () => fetchAzoresbusTrackingHealth(),
    enabled,
    staleTime: DEFAULT_STALE_MS,
    refetchInterval: false,
    refetchOnMount: 'always',
    // The fetcher turns the server's 502 verdict into data, so a rejection here
    // can only be a transport failure -- and `enabled` already tracks
    // connectivity. Retrying would just re-probe the Pi to be told the same
    // thing, slowly.
    retry: false,
  });

  /**
   * `force` is what the "Try again" button needs: without it the retry is handed
   * the cached verdict and the button appears to do nothing.
   */
  const refetchHealth = useCallback(
    async (opts?: { force?: boolean }) => {
      if (opts?.force) {
        const data = await queryClient.fetchQuery({
          queryKey,
          queryFn: () => fetchAzoresbusTrackingHealth({ force: true }),
          staleTime: 0,
        });
        return { data };
      }
      return query.refetch();
    },
    [query.refetch, queryClient, queryKey],
  );

  return { ...query, refetchHealth };
}
