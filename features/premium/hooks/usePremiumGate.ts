import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { usePaywall } from '@/features/premium/hooks/usePaywall';
import { setPendingPaywall } from '@/features/premium/lib/paywall-intent';
import { useAuthStore } from '@/lib/auth-store';
import { usePremium } from '@/lib/premium-store';

/**
 * Shared seam for premium-gated actions (tracking, pinning, …).
 *
 * - Premium → run the action immediately.
 * - Signed-out free → defer a paywall and route to sign-in; the sign-in screen
 *   resumes into the paywall on success (see `consumePendingPaywall`).
 * - Signed-in free → present the RevenueCat paywall (`presentIfNeeded`).
 */
export function usePremiumGate() {
  const isPremium = usePremium();
  const isSignedIn = useAuthStore((s) => Boolean(s.token));
  const router = useRouter();
  const { presentIfNeeded } = usePaywall();

  const guardPremiumAction = useCallback(
    async (action: () => void) => {
      if (isPremium) {
        action();
        return;
      }
      if (!isSignedIn) {
        setPendingPaywall(true);
        router.push('/auth/sign-in');
        return;
      }
      await presentIfNeeded();
    },
    [isPremium, isSignedIn, presentIfNeeded, router],
  );

  return { isPremium, guardPremiumAction };
}
