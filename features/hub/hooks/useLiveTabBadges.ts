import { useMemo } from 'react';

import type { ModuleKey } from '@/config/island';
import { useSeismicEvents } from '@/features/earthquakes/hooks/useEarthquakeQueries';
import { useTrafficReports } from '@/features/traffic/hooks/useTrafficQueries';
import { MODULE_KEY_TO_TAB_SCREEN } from '@/lib/hub-tab-screens';
import {
  LIVE_SEISMIC_HOURS,
  countActiveTrafficAlerts,
  countLiveSeismicAlerts,
} from '@/lib/live-alerts';

const TAB_BADGE_POLL_MS = 60_000;

function isOnTabBar(key: ModuleKey, enabledKeys: ModuleKey[], pinnedKeys: ModuleKey[]): boolean {
  return enabledKeys.includes(key) && pinnedKeys.includes(key);
}

/** Live alert counts for traffic / seismic tabs when those modules are pinned on the nav bar. */
export function useLiveTabBadges(enabledKeys: ModuleKey[], pinnedKeys: ModuleKey[]) {
  const trafficOn = isOnTabBar('traffic', enabledKeys, pinnedKeys);
  const seismicOn = isOnTabBar('seismic', enabledKeys, pinnedKeys);

  const seismic = useSeismicEvents(LIVE_SEISMIC_HOURS, seismicOn, TAB_BADGE_POLL_MS);
  const traffic = useTrafficReports({
    enabled: trafficOn,
    refetchInterval: TAB_BADGE_POLL_MS,
    limit: 100,
  });

  return useMemo(() => {
    const counts: Partial<Record<string, number>> = {};
    if (trafficOn) {
      const screen = MODULE_KEY_TO_TAB_SCREEN.traffic;
      counts[screen] = countActiveTrafficAlerts(traffic.data ?? []);
    }
    if (seismicOn) {
      const screen = MODULE_KEY_TO_TAB_SCREEN.seismic;
      counts[screen] = countLiveSeismicAlerts(seismic.data ?? []);
    }
    return counts;
  }, [trafficOn, seismicOn, traffic.data, seismic.data]);
}
