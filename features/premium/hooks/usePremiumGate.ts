import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { usePaywall } from '@/features/premium/hooks/usePaywall';
import { usePremium } from '@/lib/premium-store';

/**
 * Shared seam for premium-gated actions (tracking, pinning, …).
 *
 * - Premium → run the action immediately.
 * - Signed-out free → present the RevenueCat paywall directly (anonymous purchase).
 * - Signed-in free → present the RevenueCat paywall (`presentIfNeeded`).
 *
 * Every outcome has to lead somewhere. This gate is the only caller of
 * `presentIfNeeded` — every other upsell in the app uses `openPaywall`, which
 * presents unconditionally — and `presentPaywallIfNeeded` has one outcome the
 * others do not: `NOT_PRESENTED`, meaning RevenueCat sees the entitlement
 * already and declines to sell it again. Treating that as "nothing to do" is
 * what made a granted account tap a button that did nothing at all, while the
 * very same account could open the paywall from any other CTA.
 *
 * So: entitled — however we found out — runs the action. Failure says so.
 * Only an outright cancel is silent, because the rider chose it.
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

      // NOT_PRESENTED means the entitlement is already held and no paywall was
      // needed; PURCHASED/RESTORED mean it is held now. All three are premium,
      // whatever `usePremium()` still believes — `presentIfNeeded` reconciles
      // the store entitlement, so the next tap takes the fast path above.
      if (
        result === PAYWALL_RESULT.NOT_PRESENTED ||
        result === PAYWALL_RESULT.PURCHASED ||
        result === PAYWALL_RESULT.RESTORED
      ) {
        action();
        return;
      }

      // null is this hook's failure sentinel — SDK not configured, offerings
      // unfetchable, the native call throwing. Never leave that silent.
      if (result == null || result === PAYWALL_RESULT.ERROR) {
        Alert.alert(t('premiumUnavailableTitle'), t('premiumUnavailableMessage'));
      }
      // CANCELLED falls through in silence: the rider closed it on purpose.
    },
    [isPremium, presentIfNeeded, t],
  );

  return { isPremium, guardPremiumAction };
}
