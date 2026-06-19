import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { resolveMinibusApiLocale } from '@/features/minibus/locale';
import { searchMinibusJourneys } from '@/features/minibus/routeSearch';
import { staticIslandConfig } from '@/config/island';
import { fetchMinibusRoute } from '@/lib/api';
import { useNetwork } from '@/lib/network-provider';
import type { MinibusJourney, MinibusNetwork, MinibusRouteEndpoint } from '@/lib/types';

export interface MinibusRouteResult {
  origin: MinibusRouteEndpoint;
  destination: MinibusRouteEndpoint;
  journeys: MinibusJourney[];
}

export interface MinibusRouteSearchState {
  result: MinibusRouteResult | null;
  isLoading: boolean;
  /** Where the result came from — local cached network or the live API. */
  source: 'offline' | 'api' | null;
  isOnline: boolean;
}

/**
 * Offline-first route search: when a cached network is supplied it is searched
 * locally (instant, no network), otherwise the v3 API is queried. The caller
 * owns the offline snapshot (so it is only synced once per screen).
 */
export function useMinibusRouteSearch(
  network: MinibusNetwork | null,
  origin: string,
  destination: string,
  enabled = true,
): MinibusRouteSearchState {
  const { i18n } = useTranslation();
  const locale = resolveMinibusApiLocale(i18n.language);
  const { isOnline } = useNetwork();

  const trimmedOrigin = origin.trim();
  const trimmedDestination = destination.trim();
  const ready = enabled && Boolean(trimmedOrigin && trimmedDestination);

  const localResult = useMemo<MinibusRouteResult | null>(() => {
    if (!ready || !network) {
      return null;
    }
    return searchMinibusJourneys(network, trimmedOrigin, trimmedDestination);
  }, [ready, network, trimmedOrigin, trimmedDestination]);

  const query = useQuery({
    queryKey: ['minibus', 'route', staticIslandConfig.islandKey, locale, trimmedOrigin, trimmedDestination],
    queryFn: () => fetchMinibusRoute({ origin: trimmedOrigin, destination: trimmedDestination, locale }),
    enabled: ready && !network && isOnline,
    staleTime: 1000 * 60 * 60,
  });

  const result = localResult ?? query.data ?? null;
  return {
    result,
    isLoading: ready && !localResult && query.isLoading,
    source: localResult ? 'offline' : query.data ? 'api' : null,
    isOnline,
  };
}
