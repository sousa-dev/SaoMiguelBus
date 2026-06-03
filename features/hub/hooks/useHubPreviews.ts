import { useMemo } from 'react';

import type { ModuleKey } from '@/config/island';
import { useSeismicEvents } from '@/features/earthquakes/hooks/useEarthquakeQueries';
import { useTrafficReports } from '@/features/traffic/hooks/useTrafficQueries';
import { LIVE_SEISMIC_HOURS } from '@/lib/live-alerts';

const HUB_TRAFFIC_POLL_MS = 60_000;

export function useHubPreviews(enabledKeys: ModuleKey[]) {
  const enabled = useMemo(() => new Set(enabledKeys), [enabledKeys]);
  const seismicOn = enabled.has('seismic');
  const trafficOn = enabled.has('traffic');

  const seismic = useSeismicEvents(LIVE_SEISMIC_HOURS, seismicOn);
  const traffic = useTrafficReports({
    enabled: trafficOn,
    refetchInterval: HUB_TRAFFIC_POLL_MS,
    limit: 100,
  });

  const seismicEvents = seismicOn ? (seismic.data ?? []) : [];
  const trafficReports = trafficOn ? (traffic.data ?? []) : [];

  return {
    seismicEvents,
    trafficReports,
    seismicLoading: seismicOn && seismic.isLoading,
    trafficLoading: trafficOn && traffic.isLoading,
  };
}
