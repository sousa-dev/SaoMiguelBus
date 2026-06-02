import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchSeismicEvent, fetchSeismicEvents, postSeismicFelt } from '@/lib/api';
import { track } from '@/lib/analytics';
import { getOrCreateSessionId } from '@/lib/session';

export function useSeismicEvents(enabled = true) {
  return useQuery({
    queryKey: ['seismic', 'v1', 'events'],
    queryFn: () => fetchSeismicEvents({ limit: 50 }),
    enabled,
    staleTime: 1000 * 60 * 5,
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
    mutationFn: async (intensity: number) => {
      const sessionId = await getOrCreateSessionId();
      return postSeismicFelt(eventId, { session_id: sessionId, intensity });
    },
    onSuccess: (_data, intensity) => {
      track('seismic', 'engage', { action: 'felt', event_id: eventId, intensity });
      void queryClient.invalidateQueries({ queryKey: ['seismic', 'v1', 'event', eventId] });
      void queryClient.invalidateQueries({ queryKey: ['seismic', 'v1', 'events'] });
    },
  });
}
