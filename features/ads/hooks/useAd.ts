import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { Linking, Platform } from 'react-native';

import { resolveAdSlotKind } from '@/features/ads/lib/ad-slot';
import { isAdMobNativeAvailable } from '@/features/ads/lib/admob-runtime';
import { resolveAdHref } from '@/features/ads/lib/ad-link';
import { track } from '@/lib/analytics';
import { fetchAd, recordAdClick } from '@/lib/api';
import { canInitAdMob, canShowFirstPartyAds } from '@/lib/consent-store';
import { logger } from '@/lib/logger';
import { useNetwork } from '@/lib/network-provider';
import { getAnalyticsPlatform } from '@/lib/platform';
import { usePremium } from '@/lib/premium-store';
import type { AdPayload } from '@/lib/types';

/**
 * Fetch a single ad slot with first-party priority and AdMob banner fallback.
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
  const canShowAdMob =
    enabled && canInitAdMob(isPremium) && Platform.OS !== 'web' && isAdMobNativeAvailable();

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
  const kind = resolveAdSlotKind({
    enabled,
    firstParty: ad,
    fetched: query.isFetched,
    canShowAdMob,
  });

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

  return { kind, ad, openAd, enabled, on, slot };
}
