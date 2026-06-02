import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import {
  fetchBootstrap,
  fetchDirections,
  fetchStops,
  fetchTripDetail,
  searchTransit,
  voteTrip,
} from '@/lib/api';
import { track } from '@/lib/analytics';
import type { BootstrapResponse } from '@/lib/types';

export function useBootstrap() {
  return useQuery({
    queryKey: ['bootstrap', 'v3'],
    queryFn: fetchBootstrap,
    staleTime: 1000 * 60 * 5,
  });
}

/** Cached bootstrap only — does not refetch when the screen mounts. */
export function useBootstrapCached() {
  return useQuery<BootstrapResponse>({
    queryKey: ['bootstrap', 'v3'],
    queryFn: fetchBootstrap,
    enabled: false,
  });
}

export function useStops() {
  return useQuery({
    queryKey: ['transit', 'stops'],
    queryFn: fetchStops,
  });
}

export function useTransitSearch(params: {
  origin: string;
  destination: string;
  day: string;
  start: string;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: ['transit', 'search', params],
    queryFn: async () => {
      const results = await searchTransit({
        origin: params.origin,
        destination: params.destination,
        day: params.day,
        start: params.start,
      });
      track('transit', 'search', {
        origin: params.origin,
        destination: params.destination,
        day_type: params.day,
        start_time: params.start,
        results_count: results.length,
      });
      return results;
    },
    enabled: params.enabled,
    networkMode: 'online',
  });
}

export function useDirections(params: {
  origin: string;
  destination: string;
  day: string;
  start: string;
  enabled: boolean;
}) {
  const { i18n } = useTranslation();
  return useQuery({
    queryKey: ['transit', 'directions', params, i18n.language],
    queryFn: async () => {
      const data = await fetchDirections({
        origin: params.origin,
        destination: params.destination,
        day: params.day,
        start: params.start,
        locale: i18n.language,
      });
      track('transit', 'engage', {
        action: 'get_directions',
        origin: params.origin,
        destination: params.destination,
        day_type: params.day,
        routes_count: data.routes?.length ?? 0,
      });
      return data;
    },
    enabled: params.enabled,
    networkMode: 'online',
    retry: 1,
  });
}

export function useTripDetail(tripId: number, enabled = true) {
  return useQuery({
    queryKey: ['transit', 'trip', tripId],
    queryFn: () => fetchTripDetail(tripId),
    enabled: enabled && tripId > 0,
  });
}

export function useTripVote() {
  return useMutation({
    mutationFn: ({ tripId, vote }: { tripId: number; vote: 'like' | 'dislike' }) =>
      voteTrip(tripId, vote),
  });
}
