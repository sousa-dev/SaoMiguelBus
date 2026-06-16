import { useCallback } from 'react';

import { usePaywall } from '@/features/premium/hooks/usePaywall';
import { usePremium } from '@/lib/premium-store';

/**
 * Shared seam for premium-gated actions (tracking, pinning, …).
 *
 * - Premium → run the action immediately.
 * - Signed-out free → present the RevenueCat paywall directly (anonymous purchase).
 * - Signed-in free → present the RevenueCat paywall (`presentIfNeeded`).
 */
export function usePremiumGate() {
  const isPremium = usePremium();
  const { presentIfNeeded } = usePaywall();

  const guardPremiumAction = useCallback(
    async (action: () => void) => {
      if (isPremium) {
        action();
        return;
      }
      await presentIfNeeded();
    },
    [isPremium, presentIfNeeded],
  );

  return { isPremium, guardPremiumAction };
}
