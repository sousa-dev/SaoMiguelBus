import { useQuery } from '@tanstack/react-query';

import { staticIslandConfig } from '@/config/island';
import { fetchWeatherParish, fetchWeatherParishes } from '@/lib/api';

export function useWeatherParishes(enabled = true) {
  return useQuery({
    queryKey: ['weather', 'v1', 'parishes', staticIslandConfig.islandKey],
    queryFn: fetchWeatherParishes,
    enabled,
    staleTime: 1000 * 60 * 30,
    refetchOnMount: 'always',
  });
}

export function useWeatherParish(slug: string, enabled = true) {
  return useQuery({
    queryKey: ['weather', 'v1', 'parish', staticIslandConfig.islandKey, slug],
    queryFn: () => fetchWeatherParish(slug),
    enabled: enabled && Boolean(slug),
    staleTime: 1000 * 60 * 30,
    refetchOnMount: 'always',
  });
}
