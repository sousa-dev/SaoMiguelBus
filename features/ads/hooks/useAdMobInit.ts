import { isAdMobNativeAvailable } from '@/features/ads/lib/admob-native';
import { useEffect } from 'react';

import { initializeAdMob, teardownAdMob } from '@/features/ads/lib/admob-runtime';
import { useConsentStore } from '@/lib/consent-store';
import { usePremium } from '@/lib/premium-store';

/**
 * Lazy-init AdMob when the user is non-premium and has granted the `ads` consent
 * purpose. Tears the SDK down when consent is withdrawn.
 */
export function useAdMobInit() {
  const isPremium = usePremium();
  const decided = useConsentStore((s) => s.decided);
  const adsConsent = useConsentStore((s) => s.purposes.ads);
  const eligible = decided && adsConsent && !isPremium;

  useEffect(() => {
    if (!eligible || !isAdMobNativeAvailable()) {
      teardownAdMob();
      return;
    }
    void initializeAdMob();
    return () => {
      // Keep SDK alive while eligible; teardown only when eligibility flips false.
    };
  }, [eligible]);
}
