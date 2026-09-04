import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';
import { Linking, Platform } from 'react-native';

import { useAdFreeWindow } from '@/features/ads/hooks/useAdFreeWindow';
import { canShowInternalAdsOffline } from '@/features/ads/lib/ad-offline-gate';
import { needsInternalCreative, resolveAdSlotKind } from '@/features/ads/lib/ad-slot';
import { shouldForceInternalAds } from '@/features/ads/lib/force-internal-ads';
import { isAdMobNativeAvailable } from '@/features/ads/lib/admob-runtime';
import { resolveAdHref } from '@/features/ads/lib/ad-link';
import { selectInternalCreative } from '@/features/ads/lib/internal-ads/select-creative';
import { useBootstrapCached } from '@/features/transit/hooks/useTransitQueries';
import { resolveEnabledModules } from '@/config/island';
import { track } from '@/lib/analytics';
import { fetchAd, recordAdClick } from '@/lib/api';
import { canInitAdMob } from '@/lib/consent-store';
import { logger } from '@/lib/logger';
import { useNetwork } from '@/lib/network-provider';
import { getAnalyticsPlatform } from '@/lib/platform';
import { usePremium } from '@/lib/premium-store';
import type { AdPayload } from '@/lib/types';

/**
 * Fetch a single ad slot: API first-party → AdMob → internal fallback.
 *
 * Internal fallback works offline when premium state is reliably known, or
 * when the DEV force-internal toggle is on.
 */
export function useAd(on: string, slot: string | number = 'top') {
  const isPremium = usePremium();
  const { showAds } = useAdFreeWindow();
  const { isOnline } = useNetwork();
  const queryClient = useQueryClient();
  const platform = getAnalyticsPlatform();
  const { data: bootstrap } = useBootstrapCached();
  const forceInternal = shouldForceInternalAds();
  const offlineInternalEligible = canShowInternalAdsOffline(isPremium, showAds);
  const onlineFetchEnabled = showAds && isOnline && !forceInternal;
  const canShowAdMob =
    showAds &&
    !forceInternal &&
    canInitAdMob(showAds) &&
    Platform.OS !== 'web' &&
    isAdMobNativeAvailable();

  const enabledModuleKeys = useMemo(
    () => resolveEnabledModules(bootstrap?.island?.enabledModules),
    [bootstrap?.island?.enabledModules],
  );

  useEffect(() => {
    if (!onlineFetchEnabled) {
      queryClient.removeQueries({ queryKey: ['ad', on, platform, slot] });
    }
  }, [onlineFetchEnabled, on, platform, queryClient, slot]);

  const query = useQuery<AdPayload | null>({
    queryKey: ['ad', on, platform, slot],
    queryFn: () => fetchAd({ on, platform }),
    enabled: onlineFetchEnabled,
    staleTime: 1000 * 60,
    retry: false,
  });

  const ad = onlineFetchEnabled ? (query.data ?? null) : null;
  const slotKey = `${on}:${slot}`;
  const kind = resolveAdSlotKind({
    enabled: showAds,
    forceInternal,
    firstParty: ad,
    fetched: forceInternal || !isOnline || query.isFetched,
    canShowAdMob,
    isOnline,
    offlineInternalEligible,
  });

  const selectedCreative = needsInternalCreative(kind)
    ? selectInternalCreative({ slotKey, enabledModuleKeys })
    : null;

  const internalCreative = kind === 'internal' ? selectedCreative : null;
  /** Held in reserve for an AdMob slot that comes back with no fill. */
  const fallbackCreative = kind === 'admob' ? selectedCreative : null;

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

  return { kind, ad, internalCreative, fallbackCreative, openAd, enabled: showAds, on, slot };
}
