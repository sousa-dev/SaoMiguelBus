import { useEffect } from 'react';

import { useReconcileEntitlement } from '@/features/premium/hooks/useReconcileEntitlement';
import { useStoreEntitlementSync } from '@/features/premium/hooks/useStoreEntitlementSync';
import { useAuthStore } from '@/lib/auth-store';
import i18n from '@/lib/i18n';
import {
  bindRevenueCatIdentity,
  configureRevenueCat,
  onCustomerInfoUpdate,
  syncRevenueCatLocale,
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

  useStoreEntitlementSync();

  useEffect(() => {
    configureRevenueCat();
    void syncRevenueCatLocale(i18n.language);

    const onLanguageChanged = (lng: string) => {
      void syncRevenueCatLocale(lng);
    };
    i18n.on('languageChanged', onLanguageChanged);

    const removeCustomerInfoListener = onCustomerInfoUpdate((info) => {
      void reconcile(info);
    });

    return () => {
      i18n.off('languageChanged', onLanguageChanged);
      removeCustomerInfoListener();
    };
  }, [reconcile]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    void (async () => {
      const customerInfo = await bindRevenueCatIdentity(useAuthStore.getState().user);
      if (customerInfo) {
        await reconcile(customerInfo);
      }
    })();
  }, [hydrated, userId, reconcile]);
}
