import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

import { staticIslandConfig } from '@/config/island';
import {
  minibusTrackingPollIntervalMs,
  minibusTrackingStaleTimeMs,
} from '@/features/minibus/lib/trackingPollInterval';
import type { TrackingQueryOptions } from '@/features/minibus/hooks/useMinibusTrackingQueries';
import { fetchMinibusVehicle } from '@/lib/api';
import type { MinibusVehicleDetail, MinibusVehicleDetailResponse } from '@/lib/types';

/** Background detail fetches so the live fleet list can show each bus current stop. */
export function useMinibusFleetVehicleDetails(
  vehicleIds: string[],
  options: TrackingQueryOptions = {},
) {
  const { enabled = true, screenActive = false } = options;
  const ids = useMemo(
    () => [...new Set(vehicleIds.map((id) => id.trim()).filter(Boolean))],
    [vehicleIds],
  );

  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['minibus', 'v1', 'vehicle', staticIslandConfig.islandKey, id],
      queryFn: () => fetchMinibusVehicle(id),
      enabled: enabled && id.length > 0,
      staleTime: (query: { state: { data: unknown } }) =>
        minibusTrackingStaleTimeMs(query.state.data as MinibusVehicleDetailResponse | undefined),
      refetchOnMount: true as const,
      refetchOnWindowFocus: false as const,
      refetchInterval: screenActive
        ? (query: { state: { data: unknown } }) =>
            minibusTrackingPollIntervalMs(query.state.data as MinibusVehicleDetailResponse | undefined)
        : false,
      refetchIntervalInBackground: false,
    })),
  });

  const detailsById = useMemo(() => {
    const map = new Map<string, MinibusVehicleDetail>();
    ids.forEach((id, index) => {
      const vehicle = queries[index]?.data?.vehicle;
      if (vehicle) {
        map.set(id, vehicle);
      }
    });
    return map;
  }, [ids, queries]);

  return { detailsById, isLoading: queries.some((query) => query.isLoading && !query.data) };
}
