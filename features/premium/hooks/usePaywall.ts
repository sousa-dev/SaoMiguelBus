import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import Purchases from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { useReconcileEntitlement } from '@/features/premium/hooks/useReconcileEntitlement';
import { setPendingPaywall } from '@/features/premium/lib/paywall-intent';
import { useAuthStore } from '@/lib/auth-store';
import { logger } from '@/lib/logger';
import { isRevenueCatConfigured, PREMIUM_ENTITLEMENT_ID } from '@/lib/revenuecat';

/**
 * Imperative RevenueCat paywall presentation.
 *
 * - `openPaywall()` — explicit upsell. Requires sign-in first (so the purchase is
 *   attributed to the backend account); if signed out, routes to sign-in and
 *   resumes the paywall on success.
 * - `presentIfNeeded()` — gate a premium feature; shows the paywall only when the
 *   user lacks the entitlement.
 *
 * Both reconcile entitlement after a purchase/restore.
 */
export function usePaywall() {
  const router = useRouter();
  const reconcile = useReconcileEntitlement();
  const isSignedIn = useAuthStore((s) => Boolean(s.token));

  const reconcileIfChanged = useCallback(
    async (result: PAYWALL_RESULT) => {
      if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
        const info = await Purchases.getCustomerInfo();
        await reconcile(info);
      }
      return result;
    },
    [reconcile],
  );

  const present = useCallback(async (): Promise<PAYWALL_RESULT | null> => {
    if (!isRevenueCatConfigured()) {
      logger.debug('Paywall: RevenueCat not configured — skipping');
      return null;
    }
    try {
      const result = await RevenueCatUI.presentPaywall();
      return reconcileIfChanged(result);
    } catch (error) {
      logger.error('Paywall: present failed', error);
      return null;
    }
  }, [reconcileIfChanged]);

  const presentIfNeeded = useCallback(async (): Promise<PAYWALL_RESULT | null> => {
    if (!isRevenueCatConfigured()) {
      return null;
    }
    try {
      const result = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: PREMIUM_ENTITLEMENT_ID,
      });
      return reconcileIfChanged(result);
    } catch (error) {
      logger.error('Paywall: presentIfNeeded failed', error);
      return null;
    }
  }, [reconcileIfChanged]);

  const openPaywall = useCallback(async () => {
    if (!isSignedIn) {
      setPendingPaywall(true);
      router.push('/auth/sign-in');
      return;
    }
    await present();
  }, [isSignedIn, present, router]);

  return { openPaywall, present, presentIfNeeded };
}
