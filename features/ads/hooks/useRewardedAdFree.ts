import { useCallback } from 'react';

import { useAdFreeWindow } from '@/features/ads/hooks/useAdFreeWindow';
import { useRewardedAdAvailability } from '@/features/ads/hooks/useRewardedAdAvailability';
import {
  isRewardedAdLoaded,
  preloadRewardedAd,
  showRewardedAd,
} from '@/features/ads/lib/admob-runtime';
import {
  type RewardedAdFreeSource,
  useRewardedAdStore,
} from '@/features/ads/lib/rewarded-ad-store';
import { usePaywall } from '@/features/premium/hooks/usePaywall';
import { track } from '@/lib/analytics';
import { usePremium } from '@/lib/premium-store';

export type { RewardedAdFreeSource };

export function useRewardedAdFree(source: RewardedAdFreeSource) {
  const isPremium = usePremium();
  const isRewardOfferAvailable = useRewardedAdAvailability();
  const openRewardModal = useRewardedAdStore((s) => s.openRewardModal);
  const modalSource = useRewardedAdStore((s) => s.modalSource);
  const isLoading = useRewardedAdStore((s) => s.isRewardLoading);

  const openModal = useCallback(() => {
    if (isPremium || !isRewardOfferAvailable) {
      return;
    }
    track('ads', 'reward_modal_open', { source });
    openRewardModal(source);
  }, [isPremium, isRewardOfferAvailable, openRewardModal, source]);

  return {
    openModal,
    isRewardOfferAvailable,
    isLoading,
    isPremium,
    modalVisible: modalSource !== null,
  };
}

/** Shared modal actions — mount {@link AdFreeRewardModalHost} once at app root. */
export function useRewardedAdModalActions() {
  const isPremium = usePremium();
  const { grantFromReward } = useAdFreeWindow();
  const { openPaywall } = usePaywall();
  const isRewardOfferAvailable = useRewardedAdAvailability();
  const closeRewardModal = useRewardedAdStore((s) => s.closeRewardModal);
  const setRewardLoading = useRewardedAdStore((s) => s.setRewardLoading);
  const isLoading = useRewardedAdStore((s) => s.isRewardLoading);
  const modalSource = useRewardedAdStore((s) => s.modalSource);

  const closeModal = useCallback(() => {
    closeRewardModal();
  }, [closeRewardModal]);

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
    setRewardLoading(true);

    if (!isRewardedAdLoaded()) {
      preloadRewardedAd();
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    if (!isRewardedAdLoaded()) {
      setRewardLoading(false);
      return;
    }

    track('ads', 'reward_ad_show', { source: 'ad_free_modal' });
    const result = await showRewardedAd();
    setRewardLoading(false);

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
  }, [
    closeModal,
    grantFromReward,
    isLoading,
    isPremium,
    isRewardOfferAvailable,
    setRewardLoading,
  ]);

  return {
    modalVisible: modalSource !== null,
    closeModal,
    startRewardFlow,
    onGetPremium,
    isRewardOfferAvailable,
    isLoading,
    isPremium,
  };
}
