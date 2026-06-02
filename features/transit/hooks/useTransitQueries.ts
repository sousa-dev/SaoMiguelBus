import { useMutation, useQuery } from '@tanstack/react-query';

import { fetchBootstrap, fetchStops, searchTransit, voteTrip } from '@/lib/api';
import { track } from '@/lib/analytics';

export function useBootstrap() {
  return useQuery({
    queryKey: ['bootstrap'],
    queryFn: fetchBootstrap,
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
  });
}

export function useTripVote() {
  return useMutation({
    mutationFn: ({ tripId, vote }: { tripId: number; vote: 'like' | 'dislike' }) =>
      voteTrip(tripId, vote),
  });
}
