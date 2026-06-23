import { useQuery } from '@tanstack/react-query';

import { staticIslandConfig } from '@/config/island';
import { fetchMinibusVehicle, fetchMinibusVehicles } from '@/lib/api';
import type { MinibusTrackingMeta, MinibusVehicleDetailResponse, MinibusVehiclesResponse } from '@/lib/types';

const DEFAULT_POLL_MS = 10_000;

export function minibusTrackingPollIntervalMs(meta?: MinibusTrackingMeta | null): number {
  const seconds = meta?.cacheMaxAgeSeconds;
  if (typeof seconds === 'number' && seconds > 0) {
    return seconds * 1000;
  }
  return DEFAULT_POLL_MS;
}

type TrackingQueryOptions = {
  enabled?: boolean;
  screenActive?: boolean;
};

export function useMinibusVehicles(options: TrackingQueryOptions = {}) {
  const { enabled = true, screenActive = false } = options;

  return useQuery({
    queryKey: ['minibus', 'v1', 'vehicles', staticIslandConfig.islandKey],
    queryFn: fetchMinibusVehicles,
    enabled,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: screenActive
      ? (query) => minibusTrackingPollIntervalMs(query.state.data as MinibusVehiclesResponse | undefined)
      : false,
    refetchIntervalInBackground: false,
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
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: screenActive
      ? (query) =>
          minibusTrackingPollIntervalMs(query.state.data as MinibusVehicleDetailResponse | undefined)
      : false,
    refetchIntervalInBackground: false,
  });
}
