import Purchases from 'react-native-purchases';
import { useEffect } from 'react';

import { optimisticEntitlementFromCustomerInfo } from '@/features/premium/lib/optimistic-entitlement';
import { useEntitlementStore } from '@/lib/entitlement-store';
import { isRevenueCatConfigured, onCustomerInfoUpdate } from '@/lib/revenuecat';

/**
 * Keeps the persisted store entitlement in sync with RevenueCat CustomerInfo.
 * Works for anonymous and signed-in users — mount once near the app root.
 */
export function useStoreEntitlementSync() {
  const reconcileFromStore = useEntitlementStore((s) => s.reconcileFromStore);

  useEffect(() => {
    if (!isRevenueCatConfigured()) {
      return;
    }

    const syncFromCustomerInfo = async () => {
      try {
        const info = await Purchases.getCustomerInfo();
        reconcileFromStore(optimisticEntitlementFromCustomerInfo(info));
      } catch {
        // Non-fatal — premium may still come from persisted store state.
      }
    };

    void syncFromCustomerInfo();

    const removeCustomerInfoListener = onCustomerInfoUpdate((info) => {
      reconcileFromStore(optimisticEntitlementFromCustomerInfo(info));
    });

    return removeCustomerInfoListener;
  }, [reconcileFromStore]);
}
