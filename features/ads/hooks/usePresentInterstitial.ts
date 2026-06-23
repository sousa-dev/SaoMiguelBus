import { useCallback, useMemo } from 'react';

import { useAdFreeWindow } from '@/features/ads/hooks/useAdFreeWindow';
import { requestInterstitial, type InterstitialIntent } from '@/features/ads/lib/interstitial-request';

export function usePresentInterstitial() {
  const { showAds } = useAdFreeWindow();

  const presentInterstitial = useCallback(
    async (intent: InterstitialIntent = 'live_entry') => {
      if (!showAds) {
        return;
      }
      await requestInterstitial(intent);
    },
    [showAds],
  );

  return useMemo(() => ({ presentInterstitial, showAds }), [presentInterstitial, showAds]);
}
