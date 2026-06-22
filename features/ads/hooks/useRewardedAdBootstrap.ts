import { useEffect, useMemo } from 'react';

import { getAdMobRewardedUnitId } from '@/config/admob';
import { useRewardedAdStore } from '@/features/ads/lib/rewarded-ad-store';
import {
  initializeAdMob,
  isAdMobCanRequestAds,
  isAdMobInitialized,
  isAdMobNativeAvailable,
  onRewardedAdLoadStateChanged,
  preloadRewardedAd,
} from '@/features/ads/lib/admob-runtime';
import { canInitAdMobForUser, useConsentStore } from '@/lib/consent-store';
import { useNetwork } from '@/lib/network-provider';
import { usePersonalizationStore } from '@/lib/personalization-store';
import { usePremium } from '@/lib/premium-store';

/**
 * Single app-wide rewarded-ad preload + availability sync (header, sidebar, etc.).
 */
export function useRewardedAdBootstrap() {
  const isPremium = usePremium();
  const userType = usePersonalizationStore((s) => s.userType);
  const { isOnline } = useNetwork();
  const decided = useConsentStore((s) => s.decided);
  const adsConsent = useConsentStore((s) => s.purposes.ads);
  const reset = useRewardedAdStore((s) => s.reset);
  const setRewardedLoaded = useRewardedAdStore((s) => s.setRewardedLoaded);
  const setCanRequestAds = useRewardedAdStore((s) => s.setCanRequestAds);

  const hasRewardedUnit = useMemo(() => Boolean(getAdMobRewardedUnitId()), []);
  const canInitAdMob = canInitAdMobForUser(isPremium);
  const isNativeAvailable = isAdMobNativeAvailable();
  const eligible =
    !isPremium &&
    isOnline &&
    userType !== 'tourist' &&
    canInitAdMob &&
    isNativeAvailable &&
    hasRewardedUnit;

  useEffect(() => {
    if (!eligible) {
      reset();
      return;
    }

    const unsubscribe = onRewardedAdLoadStateChanged(setRewardedLoaded);

    void (async () => {
      if (!isAdMobInitialized()) {
        await initializeAdMob();
      }
      const allowed = isAdMobCanRequestAds();
      setCanRequestAds(allowed);
      if (allowed) {
        preloadRewardedAd();
      }
    })();

    return unsubscribe;
  }, [adsConsent, decided, eligible, reset, setCanRequestAds, setRewardedLoaded, userType]);
}
