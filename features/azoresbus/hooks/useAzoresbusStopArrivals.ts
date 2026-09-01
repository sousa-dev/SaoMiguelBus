import { useQuery } from '@tanstack/react-query';

import { staticIslandConfig } from '@/config/island';
import { AZORESBUS_TRACKING_POLL_MS } from '@/features/azoresbus/lib/trackingPollInterval';
import { fetchAzoresbusStopArrivals } from '@/lib/api';

type Options = {
  enabled?: boolean;
  /** Poll only while the list is actually on screen. */
  screenActive?: boolean;
};

/**
 * Live buses inbound to one stop.
 *
 * Polls on the same cadence as the fleet: the server re-reads each candidate
 * vehicle's detail behind a 10s cache, so asking faster would return the same
 * numbers while costing a round trip.
 */
export function useAzoresbusStopArrivals(
  stopId: number | null,
  { enabled = true, screenActive = false }: Options = {},
) {
  return useQuery({
    queryKey: ['azoresbus', 'v1', 'stop-arrivals', staticIslandConfig.islandKey, stopId],
    queryFn: () => fetchAzoresbusStopArrivals(stopId as number),
    enabled: enabled && stopId != null,
    staleTime: AZORESBUS_TRACKING_POLL_MS,
    refetchInterval: screenActive ? AZORESBUS_TRACKING_POLL_MS : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });
}
