import { useQuery } from '@tanstack/react-query';

import { staticIslandConfig } from '@/config/island';
import { fetchWeatherParish, fetchWeatherParishHourly, fetchWeatherParishes } from '@/lib/api';

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

function isTodayDate(date: string): boolean {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return date === `${yyyy}-${mm}-${dd}`;
}

export function useWeatherParishHourly(slug: string, date: string, enabled = true) {
  const today = isTodayDate(date);
  return useQuery({
    queryKey: ['weather', 'v1', 'hourly', staticIslandConfig.islandKey, slug, date],
    queryFn: () => fetchWeatherParishHourly(slug, date),
    enabled: enabled && Boolean(slug) && Boolean(date),
    staleTime: today ? 1000 * 60 * 30 : 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24 * 7,
  });
}
