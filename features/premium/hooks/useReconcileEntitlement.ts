import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { CustomerInfo } from 'react-native-purchases';

import { optimisticEntitlementFromCustomerInfo } from '@/features/premium/lib/optimistic-entitlement';
import { useEntitlementStore } from '@/lib/entitlement-store';

/**
 * Reconcile entitlement after a purchase/restore or an SDK customer-info update.
 *
 * Optimistically unlocks premium from `customerInfo` (so the UI flips instantly),
 * then triggers an authoritative backend refetch. The grace window in the
 * entitlement store keeps premium until the webhook confirms — see
 * `reconcileFromBackend`.
 */
export function useReconcileEntitlement() {
  const queryClient = useQueryClient();
  const applyOptimisticPremium = useEntitlementStore((s) => s.applyOptimisticPremium);

  return useCallback(
    async (info: CustomerInfo) => {
      const optimistic = optimisticEntitlementFromCustomerInfo(info);
      if (optimistic) {
        applyOptimisticPremium(optimistic);
      }
      await queryClient.invalidateQueries({ queryKey: ['billing', 'entitlement'] });
    },
    [queryClient, applyOptimisticPremium],
  );
}
