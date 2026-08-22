import { useAdsDevStore } from '@/features/ads/lib/ads-dev-store';
import { devToolsEnabled } from '@/lib/dev-tools-flag';

/** Dev-tools QA override: skip API/AdMob and show internal fallback creatives. */
export function shouldForceInternalAds(): boolean {
  if (!devToolsEnabled()) {
    return false;
  }
  return useAdsDevStore.getState().forceInternalAdsFallback;
}
