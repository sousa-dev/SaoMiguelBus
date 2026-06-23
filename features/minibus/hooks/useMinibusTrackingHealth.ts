import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { staticIslandConfig } from '@/config/island';
import { fetchMinibusTrackingHealth } from '@/lib/api';
import type { MinibusTrackingHealthResponse } from '@/lib/types';

const DEFAULT_STALE_MS = 30_000;

export function minibusTrackingHealthQueryKey(islandKey: string = staticIslandConfig.islandKey) {
  return ['minibus', 'v1', 'tracking-health', islandKey] as const;
}

export function isMinibusTrackingAvailable(
  data: MinibusTrackingHealthResponse | undefined,
): boolean {
  return data?.available === true;
}

type HealthQueryOptions = {
  enabled?: boolean;
};

export function useMinibusTrackingHealth(options: HealthQueryOptions = {}) {
  const { enabled = true } = options;
  const queryClient = useQueryClient();
  const queryKey = minibusTrackingHealthQueryKey();

  const query = useQuery({
    queryKey,
    queryFn: () => fetchMinibusTrackingHealth(),
    enabled,
    staleTime: DEFAULT_STALE_MS,
    refetchInterval: false,
    refetchOnMount: 'always',
  });

  const refetchHealth = useCallback(
    async (opts?: { force?: boolean }) => {
      if (opts?.force) {
        const data = await queryClient.fetchQuery({
          queryKey,
          queryFn: () => fetchMinibusTrackingHealth({ force: true }),
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
