import { useQuery } from '@tanstack/react-query';

import { fetchTrail, fetchTrails } from '@/lib/api';

export function useTrails(enabled = true) {
  return useQuery({
    queryKey: ['trails', 'v1', 'list'],
    queryFn: () => fetchTrails({ limit: 50 }),
    enabled,
    staleTime: 1000 * 60 * 30,
    refetchOnMount: 'always',
  });
}

export function useTrail(trailId: number, enabled = true) {
  return useQuery({
    queryKey: ['trails', 'v1', 'detail', trailId],
    queryFn: () => fetchTrail(trailId),
    enabled: enabled && trailId > 0,
    staleTime: 1000 * 60 * 30,
  });
}
