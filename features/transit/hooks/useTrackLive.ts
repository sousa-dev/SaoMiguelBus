import { useQuery } from '@tanstack/react-query';

import { staticIslandConfig } from '@/config/island';
import { AZORESBUS_TRACKING_POLL_MS } from '@/features/azoresbus/lib/trackingPollInterval';
import { useLiveScreenActivity } from '@/features/live-tracking/hooks/useLiveScreenActivity';
import { fetchTransitTripsLive } from '@/lib/api';
import type { TransitTripLive } from '@/lib/types';

/**
 * The live bus for each trip id, polled on the fleet cadence while the screen
 * is focused and the app is foregrounded. An empty id list disables the query
 * entirely, so a widget with nothing tracked costs nothing.
 */
export function useTrackLive(tripIds: number[]): {
  trips: TransitTripLive[];
  dataUpdatedAt: number;
} {
  const { pollingActive } = useLiveScreenActivity();
  const key = tripIds.join(',');
  const query = useQuery({
    queryKey: ['azoresbus', 'v1', 'trips-live', staticIslandConfig.islandKey, key],
    queryFn: () => fetchTransitTripsLive(tripIds),
    enabled: tripIds.length > 0,
    staleTime: AZORESBUS_TRACKING_POLL_MS,
    refetchInterval: pollingActive && tripIds.length > 0 ? AZORESBUS_TRACKING_POLL_MS : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });
  return { trips: query.data?.trips ?? [], dataUpdatedAt: query.dataUpdatedAt };
}
