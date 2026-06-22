import { useCallback, useState } from 'react';

import { useAdFreeWindow } from '@/features/ads/hooks/useAdFreeWindow';
import { useRewardedAdAvailability } from '@/features/ads/hooks/useRewardedAdAvailability';
import {
  isRewardedAdLoaded,
  preloadRewardedAd,
  showRewardedAd,
} from '@/features/ads/lib/admob-runtime';
import { usePaywall } from '@/features/premium/hooks/usePaywall';
import { track } from '@/lib/analytics';
import { usePremium } from '@/lib/premium-store';

export type RewardedAdFreeSource = 'header' | 'sidebar';

/** Modal + reward flow for a surface; availability is shared via {@link useRewardedAdAvailability}. */
export function useRewardedAdFree(source: RewardedAdFreeSource = 'header') {
  const isPremium = usePremium();
  const { grantFromReward } = useAdFreeWindow();
  const { openPaywall } = usePaywall();
  const isRewardOfferAvailable = useRewardedAdAvailability();
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const openModal = useCallback(() => {
    if (isPremium || !isRewardOfferAvailable) {
      return;
    }
    track('ads', 'reward_modal_open', { source });
    setModalVisible(true);
  }, [isPremium, isRewardOfferAvailable, source]);

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
    if (isPremium || isLoading || !isRewardOfferAvailable) {
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
  }, [closeModal, grantFromReward, isLoading, isPremium, isRewardOfferAvailable]);

  return {
    modalVisible,
    openModal,
    closeModal,
    startRewardFlow,
    onGetPremium,
    isRewardOfferAvailable,
    isLoading,
    isPremium,
  };
}
