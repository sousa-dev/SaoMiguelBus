import { useMemo } from 'react';

import { getAdMobRewardedUnitId } from '@/config/admob';
import { isRewardOfferAvailable } from '@/features/ads/lib/reward-offer-availability';
import { useRewardedAdStore } from '@/features/ads/lib/rewarded-ad-store';
import { isAdMobNativeAvailable } from '@/features/ads/lib/admob-runtime';
import { canInitAdMobForUser } from '@/lib/consent-store';
import { useNetwork } from '@/lib/network-provider';
import { usePersonalizationStore } from '@/lib/personalization-store';
import { usePremium } from '@/lib/premium-store';

/** Shared rewarded-offer gate — same value in header, sidebar, etc. */
export function useRewardedAdAvailability(): boolean {
  const isPremium = usePremium();
  const userType = usePersonalizationStore((s) => s.userType);
  const { isOnline } = useNetwork();
  const rewardedLoaded = useRewardedAdStore((s) => s.rewardedLoaded);
  const canRequestAds = useRewardedAdStore((s) => s.canRequestAds);

  const hasRewardedUnit = useMemo(() => Boolean(getAdMobRewardedUnitId()), []);
  const canInitAdMob = canInitAdMobForUser(isPremium);
  const isNativeAvailable = isAdMobNativeAvailable();

  return isRewardOfferAvailable({
    isPremium,
    isOnline,
    userType,
    canInitAdMob,
    isNativeAvailable,
    hasRewardedUnit,
    canRequestAds,
    rewardedLoaded,
  });
}
