import React from 'react';

import { AdFreeRewardModal } from '@/features/ads/components/AdFreeRewardModal';
import { useRewardedAdModalActions } from '@/features/ads/hooks/useRewardedAdFree';

/** Single app-root host — never mount inside native stack headerRight (iOS overflow menu). */
export function AdFreeRewardModalHost() {
  const {
    modalVisible,
    closeModal,
    startRewardFlow,
    onGetPremium,
    isRewardOfferAvailable,
    isLoading,
    isPremium,
  } = useRewardedAdModalActions();

  if (isPremium) {
    return null;
  }

  return (
    <AdFreeRewardModal
      visible={modalVisible}
      canWatchVideo={isRewardOfferAvailable}
      isLoading={isLoading}
      showGetPremium
      onDismiss={closeModal}
      onWatchVideo={() => {
        void startRewardFlow();
      }}
      onGetPremium={onGetPremium}
    />
  );
}
