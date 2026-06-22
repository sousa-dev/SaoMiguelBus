import Purchases from 'react-native-purchases';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { optimisticEntitlementFromCustomerInfo } from '@/features/premium/lib/optimistic-entitlement';
import { schedulePremiumExpirySync } from '@/features/premium/lib/premium-expiry-scheduler';
import { markStoreEntitlementSyncCompleted } from '@/features/premium/lib/store-entitlement-sync-state';
import { selectEntitlement, useEntitlementStore } from '@/lib/entitlement-store';
import { isRevenueCatConfigured, onCustomerInfoUpdate } from '@/lib/revenuecat';

/**
 * Keeps the persisted store entitlement in sync with RevenueCat CustomerInfo.
 * Works for anonymous and signed-in users — mount once near the app root.
 */
export function useStoreEntitlementSync() {
  const reconcileFromStore = useEntitlementStore((s) => s.reconcileFromStore);
  const cancelExpiryTimerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isRevenueCatConfigured()) {
      return;
    }

    const rescheduleExpirySync = () => {
      cancelExpiryTimerRef.current?.();
      const entitlement = selectEntitlement(useEntitlementStore.getState());
      cancelExpiryTimerRef.current = schedulePremiumExpirySync(
        entitlement?.currentPeriodEnd,
        () => {
          void syncFromCustomerInfo();
        },
      );
    };

    const syncFromCustomerInfo = async () => {
      try {
        const info = await Purchases.getCustomerInfo();
        reconcileFromStore(optimisticEntitlementFromCustomerInfo(info));
      } catch {
        // Non-fatal — premium may still come from persisted store state.
      } finally {
        markStoreEntitlementSyncCompleted();
        rescheduleExpirySync();
      }
    };

    void syncFromCustomerInfo();

    const removeCustomerInfoListener = onCustomerInfoUpdate((info) => {
      reconcileFromStore(optimisticEntitlementFromCustomerInfo(info));
      rescheduleExpirySync();
    });

    const appStateSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        void syncFromCustomerInfo();
      }
    });

    return () => {
      removeCustomerInfoListener();
      appStateSub.remove();
      cancelExpiryTimerRef.current?.();
    };
  }, [reconcileFromStore]);
}
