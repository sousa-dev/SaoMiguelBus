import { useQuery } from '@tanstack/react-query';

import { staticIslandConfig } from '@/config/island';
import {
  minibusTrackingPollIntervalMs,
  minibusTrackingStaleTimeMs,
} from '@/features/minibus/lib/trackingPollInterval';
import { fetchMinibusVehicle, fetchMinibusVehicles } from '@/lib/api';
import type { MinibusTrackingMeta, MinibusVehicleDetailResponse, MinibusVehiclesResponse } from '@/lib/types';

export {
  minibusTrackingPollIntervalMs,
  minibusTrackingStaleTimeMs,
} from '@/features/minibus/lib/trackingPollInterval';

export type TrackingQueryOptions = {
  enabled?: boolean;
  screenActive?: boolean;
};

function trackingQueryOptions<T extends MinibusTrackingMeta>(
  screenActive: boolean,
  selectMeta: (data: T | undefined) => MinibusTrackingMeta | null | undefined,
) {
  return {
    staleTime: (query: { state: { data: unknown } }) =>
      minibusTrackingStaleTimeMs(selectMeta(query.state.data as T | undefined)),
    refetchOnMount: true as const,
    refetchOnWindowFocus: false as const,
    refetchInterval: screenActive
      ? (query: { state: { data: unknown } }) =>
          minibusTrackingPollIntervalMs(selectMeta(query.state.data as T | undefined))
      : (false as const),
    refetchIntervalInBackground: false as const,
  };
}

export function useMinibusVehicles(options: TrackingQueryOptions = {}) {
  const { enabled = true, screenActive = false } = options;

  return useQuery({
    queryKey: ['minibus', 'v1', 'vehicles', staticIslandConfig.islandKey],
    queryFn: fetchMinibusVehicles,
    enabled,
    ...trackingQueryOptions<MinibusVehiclesResponse>(screenActive, (data) => data),
  });
}

export function useMinibusVehicleDetail(
  trackingId: string | null,
  options: TrackingQueryOptions = {},
) {
  const { enabled = true, screenActive = false } = options;
  const id = trackingId?.trim() ?? '';

  return useQuery({
    queryKey: ['minibus', 'v1', 'vehicle', staticIslandConfig.islandKey, id],
    queryFn: () => fetchMinibusVehicle(id),
    enabled: enabled && id.length > 0,
    ...trackingQueryOptions<MinibusVehicleDetailResponse>(screenActive, (data) => data),
  });
}
