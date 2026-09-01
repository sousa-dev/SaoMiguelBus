import { useCallback } from 'react';
import { useRouter } from 'expo-router';

import { usePresentInterstitial } from '@/features/ads/hooks/usePresentInterstitial';
import { trackLiveEntryOpen } from '@/features/azoresbus/lib/live-analytics';
import { liveEntryProps } from '@/features/azoresbus/lib/live-analytics-props';
import { openAzoresbusLiveMap } from '@/features/azoresbus/lib/openLiveTracking';

type OpenAzoresbusLiveTrackingOptions = {
  source: 'transit_hub';
  lineCode?: string | null;
};

export function useOpenAzoresbusLiveTracking() {
  const router = useRouter();
  const { presentInterstitial } = usePresentInterstitial();

  const openLiveTracking = useCallback(
    async ({ source, lineCode }: OpenAzoresbusLiveTrackingOptions) => {
      trackLiveEntryOpen(source, liveEntryProps(lineCode));
      try {
        // The SAME 'live_entry' intent minibus uses, deliberately: the
        // interstitial cooldown is keyed per intent, so reusing it means the two
        // live entries share one frequency cap instead of each getting its own.
        await presentInterstitial('live_entry');
      } finally {
        // In `finally` so a failed or skipped ad can never strand the user on
        // the screen they tapped from.
        openAzoresbusLiveMap(router, lineCode);
      }
    },
    [presentInterstitial, router],
  );

  return { openLiveTracking };
}
