/**
 * Bootstrap queries, split out of `useTransitQueries` so that
 * `useScheduleConfig` can read them without an import cycle: the transit search
 * and stops queries now depend on the schedule config for their dataset.
 */

import { useQuery } from '@tanstack/react-query';

import { fetchBootstrap } from '@/lib/api';
import type { BootstrapResponse } from '@/lib/types';

export const BOOTSTRAP_QUERY_KEY = ['bootstrap', 'v3'] as const;

export function useBootstrap() {
  return useQuery({
    queryKey: BOOTSTRAP_QUERY_KEY,
    queryFn: fetchBootstrap,
    staleTime: 1000 * 60 * 5,
  });
}

/** Cached bootstrap only — does not refetch when the screen mounts. */
export function useBootstrapCached() {
  return useQuery<BootstrapResponse>({
    queryKey: BOOTSTRAP_QUERY_KEY,
    queryFn: fetchBootstrap,
    enabled: false,
  });
}
