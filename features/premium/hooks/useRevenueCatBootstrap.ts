import { useEffect } from 'react';

import { useReconcileEntitlement } from '@/features/premium/hooks/useReconcileEntitlement';
import { useAuthStore } from '@/lib/auth-store';
import {
  bindRevenueCatIdentity,
  configureRevenueCat,
  onCustomerInfoUpdate,
} from '@/lib/revenuecat';

/**
 * App-root RevenueCat lifecycle. Configures the SDK once, listens for
 * SDK-pushed entitlement changes (renewals/expiries), and binds the SDK
 * identity to the signed-in user — including the cold-start rehydrate case.
 * Mount once near the app root, alongside `useEntitlementSync`.
 */
export function useRevenueCatBootstrap() {
  const reconcile = useReconcileEntitlement();
  const hydrated = useAuthStore((s) => s.hydrated);
  const userId = useAuthStore((s) => s.user?.id ?? null);

  useEffect(() => {
    configureRevenueCat();
    return onCustomerInfoUpdate((info) => {
      void reconcile(info);
    });
  }, [reconcile]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    void bindRevenueCatIdentity(useAuthStore.getState().user);
  }, [hydrated, userId]);
}
