import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchMarketplaceAdminCategories,
  fetchMarketplaceAdminProviders,
  fetchMarketplaceAdminQueue,
  fetchMarketplaceAdminReviews,
  moderateMarketplaceProviderAdmin,
  moderateMarketplaceReviewAdmin,
  updateMarketplaceCategoryAdmin,
  updateMarketplaceProviderAdmin,
  updateMarketplaceReviewAdmin,
} from '@/lib/api';
import type {
  CategoryAdminWriteInput,
  ProviderAdminWriteInput,
  ReviewAdminWriteInput,
} from '@/lib/types';

const ADMIN_KEY = ['marketplace', 'admin'] as const;

function invalidateMarketplaceCaches(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ADMIN_KEY });
  void queryClient.invalidateQueries({ queryKey: ['marketplace', 'v1'] });
}

export function useMarketplaceAdminQueue(enabled = true) {
  return useQuery({
    queryKey: [...ADMIN_KEY, 'queue'],
    queryFn: fetchMarketplaceAdminQueue,
    enabled,
    staleTime: 1000 * 30,
  });
}

export function useMarketplaceAdminProviders(enabled = true) {
  return useQuery({
    queryKey: [...ADMIN_KEY, 'providers'],
    queryFn: () => fetchMarketplaceAdminProviders({ status: 'pending', limit: 100 }),
    enabled,
    staleTime: 1000 * 30,
  });
}

export function useMarketplaceAdminReviews(enabled = true) {
  return useQuery({
    queryKey: [...ADMIN_KEY, 'reviews'],
    queryFn: () => fetchMarketplaceAdminReviews({ status: 'pending', limit: 100 }),
    enabled,
    staleTime: 1000 * 30,
  });
}

export function useMarketplaceAdminCategories(enabled = true) {
  return useQuery({
    queryKey: [...ADMIN_KEY, 'categories'],
    queryFn: fetchMarketplaceAdminCategories,
    enabled,
    staleTime: 1000 * 30,
  });
}

export function useModerateMarketplaceProviderAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ providerId, action }: { providerId: number; action: 'publish' | 'reject' }) =>
      moderateMarketplaceProviderAdmin(providerId, action),
    onSuccess: () => invalidateMarketplaceCaches(queryClient),
  });
}

export function useModerateMarketplaceReviewAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, action }: { reviewId: number; action: 'publish' | 'reject' }) =>
      moderateMarketplaceReviewAdmin(reviewId, action),
    onSuccess: () => invalidateMarketplaceCaches(queryClient),
  });
}

export function useUpdateMarketplaceProviderAdmin(providerId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProviderAdminWriteInput) =>
      updateMarketplaceProviderAdmin(providerId, input),
    onSuccess: () => invalidateMarketplaceCaches(queryClient),
  });
}

export function useUpdateMarketplaceReviewAdmin(reviewId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReviewAdminWriteInput) => updateMarketplaceReviewAdmin(reviewId, input),
    onSuccess: () => invalidateMarketplaceCaches(queryClient),
  });
}

export function useUpdateMarketplaceCategoryAdmin(categoryId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CategoryAdminWriteInput) =>
      updateMarketplaceCategoryAdmin(categoryId, input),
    onSuccess: () => invalidateMarketplaceCaches(queryClient),
  });
}
