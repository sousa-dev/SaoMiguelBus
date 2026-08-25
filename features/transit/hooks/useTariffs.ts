/**
 * Fare tables (03 §6). Persisted to the query cache so the pricing screen works
 * offline; a 404 means "no snapshot synced yet", which is an empty state.
 */

import { useQuery } from '@tanstack/react-query';

import { fetchTransitTariffs } from '@/lib/api';
import type { TariffsResponse } from '@/features/transit/lib/tariffs';

export function useTariffs() {
  return useQuery<TariffsResponse>({
    queryKey: ['transit', 'tariffs'],
    queryFn: fetchTransitTariffs,
    staleTime: 1000 * 60 * 60 * 6,
    // A missing snapshot is an answer, not a transient failure — do not retry it.
    retry: (failureCount, error) =>
      (error as { status?: number } | null)?.status === 404 ? false : failureCount < 1,
  });
}
