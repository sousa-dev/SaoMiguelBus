import { useCallback } from 'react';
import Purchases from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { useReconcileEntitlement } from '@/features/premium/hooks/useReconcileEntitlement';
import {
  type PaywallVariant,
  resolveOfferingForVariant,
  resolvePaywallVariant,
} from '@/features/premium/lib/paywall-offering';
import { requestSaveSubscriptionPrompt } from '@/features/premium/lib/save-subscription-prompt';
import { track } from '@/lib/analytics';
import { useAuthStore } from '@/lib/auth-store';
import { logger } from '@/lib/logger';
import { usePersonalizationStore } from '@/lib/personalization-store';
import {
  isRevenueCatConfigured,
  PREMIUM_ENTITLEMENT_ID,
  revenueCatSetupHint,
  revenueCatSetupIssue,
} from '@/lib/revenuecat';

export type PaywallPresentOptions = {
  /** Entry point for funnel breakdown (e.g. settings, premium_search_cta). */
  source?: string;
  /** Override persona-based paywall selection (defaults to personalization user type). */
  variant?: PaywallVariant;
};

function trackPaywallOpen(
  mode: 'explicit' | 'if_needed',
  source: string | undefined,
  variant: PaywallVariant,
  offeringId: string,
) {
  track('billing', 'paywall_open', {
    mode,
    variant,
    offering_id: offeringId,
    ...(source ? { source } : {}),
  });
}

async function resolvePresentOffering(variant: PaywallVariant) {
  const offerings = await Purchases.getOfferings();
  return resolveOfferingForVariant(offerings, variant);
}

/**
 * Imperative RevenueCat paywall presentation.
 *
 * - `openPaywall()` — explicit upsell. Opens the paywall directly (no sign-in
 *   gate). After an anonymous purchase, offers to save the subscription to an
 *   account for cross-device access.
 * - `presentIfNeeded()` — gate a premium feature; shows the paywall only when the
 *   user lacks the entitlement.
 *
 * Both reconcile entitlement after a purchase/restore.
 */
export function usePaywall() {
  const reconcile = useReconcileEntitlement();

  const afterPaywallResult = useCallback(
    async (result: PAYWALL_RESULT | null) => {
      // NOT_PRESENTED is reconciled too, and that is the point: it means the
      // native SDK sees an entitlement the app does not, so refreshing here is
      // what closes the gap rather than leaving the two disagreeing every tap.
      if (
        result === PAYWALL_RESULT.PURCHASED ||
        result === PAYWALL_RESULT.RESTORED ||
        result === PAYWALL_RESULT.NOT_PRESENTED
      ) {
        const info = await Purchases.getCustomerInfo();
        await reconcile(info);
        if (result === PAYWALL_RESULT.PURCHASED && !useAuthStore.getState().token) {
          requestSaveSubscriptionPrompt();
        }
      }
      return result;
    },
    [reconcile],
  );

  const present = useCallback(async (options?: PaywallPresentOptions): Promise<PAYWALL_RESULT | null> => {
    if (!isRevenueCatConfigured()) {
      const issue = revenueCatSetupIssue();
      logger.debug('Paywall: RevenueCat not configured —', issue, revenueCatSetupHint(issue));
      return null;
    }

    const variant =
      options?.variant ??
      resolvePaywallVariant(usePersonalizationStore.getState().userType);

    try {
      const offering = await resolvePresentOffering(variant);
      trackPaywallOpen('explicit', options?.source, variant, offering?.identifier ?? 'default');
      const result = await RevenueCatUI.presentPaywall(offering ? { offering } : {});
      return afterPaywallResult(result);
    } catch (error) {
      logger.error('Paywall: present failed', error);
      return null;
    }
  }, [afterPaywallResult]);

  const presentIfNeeded = useCallback(async (options?: PaywallPresentOptions): Promise<PAYWALL_RESULT | null> => {
    if (!isRevenueCatConfigured()) {
      const issue = revenueCatSetupIssue();
      logger.debug('Paywall: RevenueCat not configured —', issue, revenueCatSetupHint(issue));
      return null;
    }

    const variant =
      options?.variant ??
      resolvePaywallVariant(usePersonalizationStore.getState().userType);

    try {
      const offering = await resolvePresentOffering(variant);
      const result = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: PREMIUM_ENTITLEMENT_ID,
        ...(offering ? { offering } : {}),
      });
      if (result != null && result !== PAYWALL_RESULT.NOT_PRESENTED) {
        trackPaywallOpen('if_needed', options?.source, variant, offering?.identifier ?? 'default');
      }
      return afterPaywallResult(result);
    } catch (error) {
      logger.error('Paywall: presentIfNeeded failed', error);
      return null;
    }
  }, [afterPaywallResult]);

  const openPaywall = useCallback(async (source?: string) => {
    await present({ source });
  }, [present]);

  return { openPaywall, present, presentIfNeeded };
}
