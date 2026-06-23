import { Platform } from 'react-native';

import {
  isAdMobInitialized,
  isAdMobNativeAvailable,
  isInterstitialAdLoaded,
  showInterstitialAd,
} from '@/features/ads/lib/admob-runtime';
import { shouldForceInternalAds } from '@/features/ads/lib/force-internal-ads';
import { selectInternalCreative } from '@/features/ads/lib/internal-ads/select-creative';
import type { InternalAdCreative } from '@/features/ads/lib/internal-ads/types';
import type { ModuleKey } from '@/config/island';
import type { InterstitialIntent } from '@/features/ads/lib/interstitial-request';
import { evaluateInterstitialPolicy } from '@/features/ads/lib/interstitial-policy';
import {
  loadInterstitialSessionState,
  persistInterstitialSessionState,
} from '@/features/ads/lib/interstitial-storage';
import { track } from '@/lib/analytics';
import { fetchAd } from '@/lib/api';
import { getAnalyticsPlatform } from '@/lib/platform';
import type { AdPayload } from '@/lib/types';

export type InterstitialShowPlan =
  | { kind: 'none' }
  | { kind: 'first_party'; ad: AdPayload }
  | { kind: 'admob' }
  | { kind: 'internal'; creative: InternalAdCreative }
  | { kind: 'upsell' };

export async function planInterstitialShow(
  intent: InterstitialIntent,
  enabledModuleKeys: ModuleKey[],
): Promise<InterstitialShowPlan> {
  if (intent === 'search') {
    const state = await loadInterstitialSessionState();
    const decision = evaluateInterstitialPolicy(state, Date.now(), Math.random());
    if (decision.nextState && Object.keys(decision.nextState).length > 0) {
      await persistInterstitialSessionState(decision.nextState);
    }
    if (!decision.show) {
      return { kind: 'none' };
    }
  }

  if (shouldForceInternalAds()) {
    const creative = selectInternalCreative({
      slotKey: 'interstitial:forced',
      enabledModuleKeys,
    });
    if (creative && Platform.OS !== 'web') {
      return { kind: 'internal', creative };
    }
    if (Platform.OS !== 'web') {
      return { kind: 'upsell' };
    }
    return { kind: 'none' };
  }

  const platform = getAnalyticsPlatform();
  const ad = await fetchAd({ on: 'interstitial', platform });

  if (ad) {
    return { kind: 'first_party', ad };
  }

  const canAdMob =
    Platform.OS !== 'web' &&
    isAdMobNativeAvailable() &&
    isAdMobInitialized() &&
    isInterstitialAdLoaded();

  if (canAdMob && showInterstitialAd()) {
    track('transit', 'ad_mob_interstitial_shown', { on: 'interstitial', intent });
    return { kind: 'admob' };
  }

  if (Platform.OS !== 'web') {
    const creative = selectInternalCreative({
      slotKey: 'interstitial:fallback',
      enabledModuleKeys,
    });
    if (creative) {
      return { kind: 'internal', creative };
    }
    return { kind: 'upsell' };
  }

  return { kind: 'none' };
}
