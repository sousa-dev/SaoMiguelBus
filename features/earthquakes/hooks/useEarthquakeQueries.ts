import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchSeismicEvent, fetchSeismicEvents, postSeismicFelt } from '@/lib/api';
import { track } from '@/lib/analytics';
import { getOrCreateSessionId } from '@/lib/session';
import type { SeismicFeltInput } from '@/lib/types';

export function useSeismicEvents(
  sinceHours = 24,
  enabled = true,
  refetchInterval: number | false = false,
) {
  return useQuery({
    queryKey: ['seismic', 'v1', 'events', sinceHours],
    queryFn: () => fetchSeismicEvents({ limit: 50, sinceHours }),
    enabled,
    staleTime: 1000 * 60 * 5,
    refetchInterval,
    refetchOnMount: 'always',
  });
}

export function useSeismicEvent(eventId: number, enabled = true) {
  return useQuery({
    queryKey: ['seismic', 'v1', 'event', eventId],
    queryFn: () => fetchSeismicEvent(eventId),
    enabled: enabled && eventId > 0,
    staleTime: 1000 * 60 * 5,
  });
}

export function useSubmitFeltReport(eventId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SeismicFeltInput) => {
      const sessionId = await getOrCreateSessionId();
      return postSeismicFelt(eventId, { session_id: sessionId, ...input });
    },
    onSuccess: (_data, input) => {
      track('seismic', 'engage', {
        action: 'felt',
        event_id: eventId,
        felt: input.felt,
        intensity: input.intensity ?? null,
      });
      void queryClient.invalidateQueries({ queryKey: ['seismic', 'v1', 'event', eventId] });
      void queryClient.invalidateQueries({ queryKey: ['seismic', 'v1', 'events'] });
    },
  });
}
