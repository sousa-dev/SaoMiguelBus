import { useCallback } from 'react';
import { useRouter } from 'expo-router';

import { usePresentInterstitial } from '@/features/ads/hooks/usePresentInterstitial';
import { trackLiveEntryOpen } from '@/features/minibus/lib/live-analytics';
import { openMinibusLiveMap } from '@/features/minibus/lib/openLiveTracking';

type OpenMinibusLiveTrackingOptions = {
  source: 'hub' | 'line_detail';
  lineSlug?: string | null;
  lineCode?: string;
};

export function useOpenMinibusLiveTracking() {
  const router = useRouter();
  const { presentInterstitial } = usePresentInterstitial();

  const openLiveTracking = useCallback(
    async ({ source, lineSlug, lineCode }: OpenMinibusLiveTrackingOptions) => {
      trackLiveEntryOpen(source, lineCode ? { line: lineCode } : {});
      try {
        await presentInterstitial('live_entry');
      } finally {
        openMinibusLiveMap(router, lineSlug);
      }
    },
    [presentInterstitial, router],
  );

  return { openLiveTracking };
}
