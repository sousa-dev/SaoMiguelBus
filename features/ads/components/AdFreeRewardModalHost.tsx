import React from 'react';

import { AdFreeRewardModal } from '@/features/ads/components/AdFreeRewardModal';
import { useRewardedAdModalActions } from '@/features/ads/hooks/useRewardedAdFree';

function formatRemainingMinutes(remainingMs: number): number {
  return Math.max(1, Math.ceil(remainingMs / 60_000));
}

/** Single app-root host — never mount inside native stack headerRight (iOS overflow menu). */
export function AdFreeRewardModalHost() {
  const {
    modalMode,
    remainingMs,
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

  const open = modalSource !== null && modalMode != null;

  return (
    <AdFreeRewardModal
      visible={open}
      mode={modalMode ?? 'status'}
      remainingMinutes={formatRemainingMinutes(remainingMs)}
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
