import { useQuery } from '@tanstack/react-query';

import { liveVehicleCountsQueryKey } from '@/features/live-tracking/lib/liveCounts';
import { fetchLiveVehicleCounts } from '@/lib/api';

const STALE_MS = 60_000;

type LiveVehicleCountsOptions = {
  enabled?: boolean;
};

/**
 * The hub screens' only tracking-related network call: a cached, per-operator
 * vehicle count that never itself reaches the AVL vendor (see
 * `GET /api/v3/transit/live-counts`). No polling and no force/retry knob --
 * unlike the health probe this replaces, there is nothing here worth
 * hammering, and a 60s staleTime keeps repeat hub visits free.
 */
export function useLiveVehicleCounts(options: LiveVehicleCountsOptions = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: liveVehicleCountsQueryKey(),
    queryFn: fetchLiveVehicleCounts,
    enabled,
    staleTime: STALE_MS,
    refetchInterval: false,
    refetchOnMount: true,
    retry: false,
  });
}
