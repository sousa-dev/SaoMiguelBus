import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { Linking } from 'react-native';

import { resolveAdHref } from '@/features/ads/lib/ad-link';
import { track } from '@/lib/analytics';
import { fetchAd, recordAdClick } from '@/lib/api';
import { canShowFirstPartyAds } from '@/lib/consent-store';
import { logger } from '@/lib/logger';
import { useNetwork } from '@/lib/network-provider';
import { getAnalyticsPlatform } from '@/lib/platform';
import { usePremium } from '@/lib/premium-store';
import type { AdPayload } from '@/lib/types';

/**
 * Fetch a single first-party ad for a slot and expose a tap handler.
 *
 * Suppressed (no network call) for premium users and while offline. Each slot
 * gets its own query key so multiple banners on the same surface rotate
 * independently, mirroring the webapp's per-slot fetch.
 */
export function useAd(on: string, slot: string | number = 'top') {
  const isPremium = usePremium();
  const { isOnline } = useNetwork();
  const queryClient = useQueryClient();
  const platform = getAnalyticsPlatform();
  const enabled = canShowFirstPartyAds(isPremium) && isOnline;

  // Drop cached creatives when ads are suppressed (premium / offline). Otherwise
  // React Query keeps stale `data` while `enabled` is false and banners still render.
  useEffect(() => {
    if (!enabled) {
      queryClient.removeQueries({ queryKey: ['ad'] });
    }
  }, [enabled, queryClient]);

  const query = useQuery<AdPayload | null>({
    queryKey: ['ad', on, platform, slot],
    queryFn: () => fetchAd({ on, platform }),
    enabled,
    staleTime: 1000 * 60,
    retry: false,
  });

  const ad = enabled ? (query.data ?? null) : null;

  const openAd = useCallback(async () => {
    if (!ad) {
      return;
    }
    track('transit', 'ad_click', { on, adId: ad.id });
    void recordAdClick(ad.id);
    const href = resolveAdHref(ad);
    if (!href) {
      return;
    }
    try {
      await Linking.openURL(href);
    } catch (error) {
      logger.warn('ad open failed', error);
    }
  }, [ad, on]);

  return { ad, openAd, enabled };
}
