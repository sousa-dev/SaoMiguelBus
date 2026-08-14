import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import {
  fetchDirections,
  fetchStops,
  fetchTripDetail,
  searchTransit,
  voteTrip,
} from '@/lib/api';
import { track } from '@/lib/analytics';
import { resolveInAppReviewConfig } from '@/features/app-review/lib/in-app-review-config';
import { recordTransitSearchSuccessAndMaybeReview } from '@/features/app-review/lib/maybe-request-app-review';
import {
  resolveVoteVerb,
  useProfileStore,
  type TripVote,
  type TripVoteMeta,
} from '@/lib/profile-store';
import { useTransitDataset } from '@/features/transit/hooks/useScheduleConfig';
import type { BootstrapResponse, TransitSearchResult } from '@/lib/types';

// Bootstrap lives in its own module so `useScheduleConfig` — which the search
// and stops queries below now depend on — can read it without an import cycle.
export { useBootstrap, useBootstrapCached } from '@/features/transit/hooks/useBootstrapQueries';

export function useStops() {
  // The pickers must offer the previewed network's stops, or a user picks a stop
  // that does not exist in the dataset being searched (03 §3). The key carries
  // the dataset even outside preview so a midnight rollover cannot serve
  // yesterday's network from a permanent key (98 §4 gap).
  const dataset = useTransitDataset();
  return useQuery({
    queryKey: ['transit', 'stops', dataset ?? 'server'],
    queryFn: () => fetchStops(dataset),
  });
}

export function useTransitSearch(params: {
  origin: string;
  destination: string;
  day: string;
  start: string;
  enabled: boolean;
}) {
  const queryClient = useQueryClient();
  const dataset = useTransitDataset();
  return useQuery({
    queryKey: ['transit', 'search', params, dataset ?? 'server'],
    queryFn: async () => {
      const results = await searchTransit({
        origin: params.origin,
        destination: params.destination,
        day: params.day,
        start: params.start,
        dataset,
      });
      track('transit', 'search', {
        origin: params.origin,
        destination: params.destination,
        day_type: params.day,
        start_time: params.start,
        results_count: results.length,
        dataset: dataset ?? 'server',
      });
      const bootstrap = queryClient.getQueryData<BootstrapResponse>(['bootstrap', 'v3']);
      const reviewConfig = resolveInAppReviewConfig(bootstrap);
      void recordTransitSearchSuccessAndMaybeReview({
        resultsCount: results.length,
        inAppReviewEnabled: reviewConfig.enabled,
        storeUrls: reviewConfig.storeUrls,
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
  const queryClient = useQueryClient();
  const getVote = useProfileStore((s) => s.getVote);
  const setVote = useProfileStore((s) => s.setVote);

  return useMutation({
    mutationFn: async ({
      tripId,
      intent,
      meta,
    }: {
      tripId: number;
      intent: TripVote;
      meta?: TripVoteMeta;
    }) => {
      const current = getVote(tripId);
      const verb = resolveVoteVerb(current, intent);
      const detail = await voteTrip(tripId, verb);
      const nextVote =
        verb === 'undo_like' || verb === 'undo_dislike'
          ? undefined
          : verb === 'switch_to_like' || verb === 'like'
            ? 'like'
            : 'dislike';
      setVote(tripId, nextVote, meta);
      track('transit', 'vote', { trip_id: tripId, direction: intent, verb });
      return detail;
    },
    onSuccess: (detail, { tripId }) => {
      queryClient.setQueryData(['transit', 'trip', tripId], detail);
      queryClient.setQueriesData<TransitSearchResult[]>(
        { queryKey: ['transit', 'search'] },
        (old) =>
          old?.map((row) =>
            row.id === tripId
              ? {
                  ...row,
                  likesPercent: detail.likesPercent ?? row.likesPercent,
                  dislikesPercent: detail.dislikesPercent ?? row.dislikesPercent,
                }
              : row,
          ),
      );
    },
  });
}
