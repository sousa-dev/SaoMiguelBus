import { useCallback, useEffect, useMemo, useState } from 'react';

import { getAdMobRewardedUnitId } from '@/config/admob';
import { useAdFreeWindow } from '@/features/ads/hooks/useAdFreeWindow';
import {
  initializeAdMob,
  isAdMobCanRequestAds,
  isAdMobInitialized,
  isAdMobNativeAvailable,
  isRewardedAdLoaded,
  onRewardedAdLoadStateChanged,
  preloadRewardedAd,
  showRewardedAd,
} from '@/features/ads/lib/admob-runtime';
import { isRewardOfferAvailable } from '@/features/ads/lib/reward-offer-availability';
import { usePaywall } from '@/features/premium/hooks/usePaywall';
import { track } from '@/lib/analytics';
import { canInitAdMobForUser } from '@/lib/consent-store';
import { useNetwork } from '@/lib/network-provider';
import { usePremium } from '@/lib/premium-store';

export type RewardedAdFreeSource = 'header' | 'sidebar';

export function useRewardedAdFree(source: RewardedAdFreeSource = 'header') {
  const isPremium = usePremium();
  const { grantFromReward } = useAdFreeWindow();
  const { isOnline } = useNetwork();
  const { openPaywall } = usePaywall();
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rewardedLoaded, setRewardedLoaded] = useState(false);
  const [canRequestAds, setCanRequestAds] = useState(false);

  const hasRewardedUnit = useMemo(() => Boolean(getAdMobRewardedUnitId()), []);
  const canInitAdMob = canInitAdMobForUser(isPremium);
  const isNativeAvailable = isAdMobNativeAvailable();

  const rewardOfferAvailable = isRewardOfferAvailable({
    isPremium,
    isOnline,
    canInitAdMob,
    isNativeAvailable,
    hasRewardedUnit,
    canRequestAds,
    rewardedLoaded,
  });

  useEffect(() => {
    if (isPremium || !isOnline || !canInitAdMob || !isNativeAvailable || !hasRewardedUnit) {
      setRewardedLoaded(false);
      setCanRequestAds(false);
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
      } else {
        setRewardedLoaded(false);
      }
    })();

    return unsubscribe;
  }, [canInitAdMob, hasRewardedUnit, isNativeAvailable, isOnline, isPremium]);

  const openModal = useCallback(() => {
    if (isPremium || !rewardOfferAvailable) {
      return;
    }
    track('ads', 'reward_modal_open', { source });
    setModalVisible(true);
  }, [isPremium, rewardOfferAvailable, source]);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setIsLoading(false);
  }, []);

  const onGetPremium = useCallback(() => {
    track('ads', 'reward_modal_premium', { source: 'ad_free_modal' });
    closeModal();
    void openPaywall('ad_free_modal');
  }, [closeModal, openPaywall]);

  const startRewardFlow = useCallback(async () => {
    if (isPremium || isLoading || !rewardOfferAvailable) {
      return;
    }

    track('ads', 'reward_modal_watch', { source: 'ad_free_modal' });
    setIsLoading(true);

    if (!isRewardedAdLoaded()) {
      preloadRewardedAd();
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    if (!isRewardedAdLoaded()) {
      setIsLoading(false);
      return;
    }

    track('ads', 'reward_ad_show', { source: 'ad_free_modal' });
    const result = await showRewardedAd();
    setIsLoading(false);

    if (result === 'earned') {
      track('ads', 'reward_ad_earned', { source: 'ad_free_modal' });
      track('ads', 'ad_free_started', { source: 'rewarded_video' });
      await grantFromReward();
      closeModal();
      return;
    }

    if (result === 'dismissed') {
      track('ads', 'reward_ad_dismissed', { source: 'ad_free_modal' });
    }
  }, [closeModal, grantFromReward, isLoading, isPremium, rewardOfferAvailable]);

  return {
    modalVisible,
    openModal,
    closeModal,
    startRewardFlow,
    onGetPremium,
    isRewardOfferAvailable: rewardOfferAvailable,
    isLoading,
    isPremium,
  };
}
