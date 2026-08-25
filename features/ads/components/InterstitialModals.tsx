import React from 'react';

import { FirstPartyInterstitialModal } from '@/features/ads/components/FirstPartyInterstitialModal';
import { InternalFullscreenAdModal } from '@/features/ads/components/InternalFullscreenAdModal';
import { PremiumUpsellModal } from '@/features/ads/components/PremiumUpsellModal';
import type { InternalAdCreative } from '@/features/ads/lib/internal-ads/types';
import type { AdPayload } from '@/lib/types';

type Props = {
  firstPartyAd: AdPayload | null;
  showFirstParty: boolean;
  internalCreative: InternalAdCreative | null;
  showInternal: boolean;
  showUpsell: boolean;
  onFirstPartyDismiss: () => void;
  onInternalDismiss: () => void;
  onUpsellDismiss: () => void;
};

export function InterstitialModals({
  firstPartyAd,
  showFirstParty,
  internalCreative,
  showInternal,
  showUpsell,
  onFirstPartyDismiss,
  onInternalDismiss,
  onUpsellDismiss,
}: Props) {
  return (
    <>
      {firstPartyAd ? (
        <FirstPartyInterstitialModal
          visible={showFirstParty}
          ad={firstPartyAd}
          onDismiss={onFirstPartyDismiss}
        />
      ) : null}
      {internalCreative ? (
        <InternalFullscreenAdModal
          visible={showInternal}
          creative={internalCreative}
          surface="interstitial"
          onDismiss={onInternalDismiss}
        />
      ) : null}
      <PremiumUpsellModal visible={showUpsell} onDismiss={onUpsellDismiss} />
    </>
  );
}
