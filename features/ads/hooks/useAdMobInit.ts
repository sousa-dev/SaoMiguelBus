import { canInitAdMob, useConsentStore } from '@/lib/consent-store';
import { isAdMobNativeAvailable } from '@/features/ads/lib/admob-native';
import { useEffect } from 'react';

import { initializeAdMob, teardownAdMob } from '@/features/ads/lib/admob-runtime';
import { usePremium } from '@/lib/premium-store';

/**
 * Lazy-init AdMob for non-premium users after CMP decision. Google UMP decides
 * whether ads may load (NPA or personalized). Re-inits when personalization
 * consent changes so ad mode refreshes.
 */
export function useAdMobInit() {
  const isPremium = usePremium();
  const decided = useConsentStore((s) => s.decided);
  const adsConsent = useConsentStore((s) => s.purposes.ads);
  const eligible = canInitAdMob(isPremium);

  useEffect(() => {
    if (!eligible || !isAdMobNativeAvailable()) {
      teardownAdMob();
      return;
    }
    teardownAdMob();
    void initializeAdMob();
  }, [eligible, adsConsent, decided]);
}
