import { useQuery } from '@tanstack/react-query';

import { staticIslandConfig } from '@/config/island';
import {
  azoresbusTrackingPollIntervalMs,
  azoresbusTrackingStaleTimeMs,
} from '@/features/azoresbus/lib/trackingPollInterval';
import { fetchAzoresbusVehicle, fetchAzoresbusVehicles } from '@/lib/api';

export type TrackingQueryOptions = {
  enabled?: boolean;
  screenActive?: boolean;
};

/**
 * Unlike minibus, the cadence is a constant rather than a function of server
 * metadata -- AzoresBus sends none. `screenActive` still gates the interval so a
 * backgrounded app stops polling without discarding what it already has.
 */
function trackingQueryOptions(screenActive: boolean) {
  return {
    staleTime: azoresbusTrackingStaleTimeMs(),
    refetchOnMount: true as const,
    refetchOnWindowFocus: false as const,
    refetchInterval: screenActive ? azoresbusTrackingPollIntervalMs() : (false as const),
    refetchIntervalInBackground: false as const,
  };
}

export function useAzoresbusVehicles(options: TrackingQueryOptions = {}) {
  const { enabled = true, screenActive = false } = options;

  return useQuery({
    queryKey: ['azoresbus', 'v1', 'vehicles', staticIslandConfig.islandKey],
    queryFn: fetchAzoresbusVehicles,
    enabled,
    ...trackingQueryOptions(screenActive),
  });
}

/**
 * One vehicle's detail, fetched only while its sheet is open.
 *
 * There is deliberately no fleet-wide equivalent: each detail is ~10KB of
 * circulations, and fanning out over 30-40 vehicles every poll would be megabytes
 * per minute through the upstream proxy. Line labels come from the server-side
 * route index on the list instead.
 */
export function useAzoresbusVehicleDetail(
  vehicleId: string | null,
  options: TrackingQueryOptions = {},
) {
  const { enabled = true, screenActive = false } = options;
  const id = vehicleId?.trim() ?? '';

  return useQuery({
    queryKey: ['azoresbus', 'v1', 'vehicle', staticIslandConfig.islandKey, id],
    queryFn: () => fetchAzoresbusVehicle(id),
    enabled: enabled && id.length > 0,
    ...trackingQueryOptions(screenActive),
  });
}
