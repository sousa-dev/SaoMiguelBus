import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import { usePaywall } from '@/features/premium/hooks/usePaywall';
import { usePremium } from '@/lib/premium-store';

/**
 * Shared seam for premium-gated actions (tracking, pinning, …).
 *
 * - Premium → run the action immediately.
 * - Signed-out free → present the RevenueCat paywall directly (anonymous purchase).
 * - Signed-in free → present the RevenueCat paywall (`presentIfNeeded`).
 *
 * A gate that cannot present its paywall must SAY so. `presentIfNeeded` returns
 * null for every failure — SDK not configured, offerings unfetchable, the native
 * call throwing — and each of those used to leave the rider tapping a button
 * that did nothing at all, with the explanation only in a debug log they will
 * never read.
 */
export function usePremiumGate() {
  const isPremium = usePremium();
  const { t } = useTranslation();
  const { presentIfNeeded } = usePaywall();

  const guardPremiumAction = useCallback(
    async (action: () => void, source?: string) => {
      if (isPremium) {
        action();
        return;
      }
      const result = await presentIfNeeded({ source });
      if (result == null) {
        Alert.alert(t('premiumUnavailableTitle'), t('premiumUnavailableMessage'));
      }
    },
    [isPremium, presentIfNeeded, t],
  );

  return { isPremium, guardPremiumAction };
}
