import { useAdsDevStore } from '@/features/ads/lib/ads-dev-store';

/** DEV-only QA override: skip API/AdMob and show internal fallback creatives. */
export function shouldForceInternalAds(): boolean {
  const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
  if (!isDev) {
    return false;
  }
  return useAdsDevStore.getState().forceInternalAdsFallback;
}
