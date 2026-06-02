import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { fetchTrail, fetchTrails } from '@/lib/api';
import { track } from '@/lib/analytics';

export type TrailListFilters = {
  difficulty?: string;
  shape?: string;
  minLength?: number;
  maxLength?: number;
};

export function useTrails(filters: TrailListFilters = {}, enabled = true) {
  const { i18n } = useTranslation();
  return useQuery({
    queryKey: ['trails', 'v1', 'list', filters, i18n.language],
    queryFn: () =>
      fetchTrails({
        difficulty: filters.difficulty,
        shape: filters.shape,
        minLength: filters.minLength,
        maxLength: filters.maxLength,
        limit: 50,
      }),
    enabled,
    staleTime: 1000 * 60 * 30,
    refetchOnMount: 'always',
  });
}

export function useTrail(trailId: number, enabled = true) {
  return useQuery({
    queryKey: ['trails', 'v1', 'detail', trailId],
    queryFn: () => fetchTrail(trailId),
    enabled: enabled && trailId > 0,
    staleTime: 1000 * 60 * 30,
  });
}

export function trackTrailFilter(filters: TrailListFilters) {
  track('trails', 'filter', {
    difficulty: filters.difficulty,
    shape: filters.shape,
    min_length: filters.minLength,
    max_length: filters.maxLength,
  });
}
