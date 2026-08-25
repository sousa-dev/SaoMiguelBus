import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createProvider,
  deleteProvider,
  fetchMarketplaceCategories,
  fetchProvider,
  fetchProviders,
  fetchReviews,
  submitReview,
  updateProvider,
} from '@/lib/api';
import { track } from '@/lib/analytics';
import type { MarketplaceListFilters } from '@/features/marketplace/filterHelpers';
import { useMarketplaceStore } from '@/lib/marketplace-store';
import type { ProviderWriteInput } from '@/lib/types';

export interface ProviderQueryParams extends MarketplaceListFilters {
  q?: string;
  lat?: number;
  lng?: number;
  enabled?: boolean;
}

function toFetchParams(params: ProviderQueryParams) {
  const { enabled: _enabled, minRating, hasRate, verified, sort, category, q, lat, lng } = params;
  return {
    category,
    q,
    lat,
    lng,
    sort,
    min_rating: minRating,
    has_rate: hasRate || undefined,
    verified: verified || undefined,
    limit: 50,
  };
}

export function useMarketplaceCategories(enabled = true) {
  return useQuery({
    queryKey: ['marketplace', 'v1', 'categories'],
    queryFn: fetchMarketplaceCategories,
    enabled,
    staleTime: 1000 * 60 * 30,
  });
}

export function useProviders(params: ProviderQueryParams = { sort: 'random' }) {
  const { enabled, ...filters } = params;
  const fetchParams = toFetchParams(filters);
  return useQuery({
    queryKey: ['marketplace', 'v1', 'providers', fetchParams],
    queryFn: async () => {
      const result = await fetchProviders(fetchParams);
      if (filters.q) {
        track('marketplace', 'search', {
          query: filters.q,
          category: filters.category ?? null,
          sort: filters.sort,
          results_count: result.providers.length,
        });
      }
      return result;
    },
    enabled: enabled !== false,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: 'always',
  });
}

export function useProvider(providerId: number, enabled = true) {
  return useQuery({
    queryKey: ['marketplace', 'v1', 'provider', providerId],
    queryFn: () => fetchProvider(providerId),
    enabled: enabled && providerId > 0,
    staleTime: 1000 * 60 * 5,
  });
}

export function useProviderReviews(providerId: number, enabled = true) {
  return useQuery({
    queryKey: ['marketplace', 'v1', 'reviews', providerId],
    queryFn: () => fetchReviews(providerId),
    enabled: enabled && providerId > 0,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: 'always',
  });
}

export function useCreateProvider() {
  const queryClient = useQueryClient();
  const addListing = useMarketplaceStore((s) => s.addListing);
  return useMutation({
    mutationFn: (input: ProviderWriteInput) => createProvider(input),
    onSuccess: (provider) => {
      addListing(provider.id);
      track('marketplace', 'engage', { action: 'create_listing', provider_id: provider.id });
      void queryClient.invalidateQueries({ queryKey: ['marketplace', 'v1', 'providers'] });
      void queryClient.invalidateQueries({ queryKey: ['marketplace', 'v1', 'categories'] });
    },
  });
}

export function useUpdateProvider(providerId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProviderWriteInput) => updateProvider(providerId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['marketplace', 'v1', 'provider', providerId] });
      void queryClient.invalidateQueries({ queryKey: ['marketplace', 'v1', 'providers'] });
    },
  });
}

export function useDeleteProvider() {
  const queryClient = useQueryClient();
  const removeListing = useMarketplaceStore((s) => s.removeListing);
  return useMutation({
    mutationFn: (providerId: number) => deleteProvider(providerId),
    onSuccess: (_data, providerId) => {
      removeListing(providerId);
      void queryClient.invalidateQueries({ queryKey: ['marketplace', 'v1', 'providers'] });
    },
  });
}

export function useSubmitReview(providerId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { rating: number; text?: string }) => submitReview(providerId, payload),
    onSuccess: (_data, payload) => {
      track('marketplace', 'engage', {
        action: 'review',
        provider_id: providerId,
        rating: payload.rating,
      });
      void queryClient.invalidateQueries({ queryKey: ['marketplace', 'v1', 'reviews', providerId] });
      void queryClient.invalidateQueries({ queryKey: ['marketplace', 'v1', 'provider', providerId] });
      void queryClient.invalidateQueries({ queryKey: ['marketplace', 'v1', 'providers'] });
    },
  });
}
