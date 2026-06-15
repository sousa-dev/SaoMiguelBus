import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { FirstPartyInterstitialModal } from '@/features/ads/components/FirstPartyInterstitialModal';
import { PremiumUpsellModal } from '@/features/ads/components/PremiumUpsellModal';
import {
  isAdMobInitialized,
  isAdMobNativeAvailable,
  isInterstitialAdLoaded,
  onInterstitialClosed,
  showInterstitialAd,
} from '@/features/ads/lib/admob-runtime';
import { markFullScreenAdShown } from '@/features/ads/lib/app-open-storage';
import { setFirstPartyInterstitialVisible } from '@/features/ads/lib/fullscreen-ad-state';
import { evaluateInterstitialPolicy } from '@/features/ads/lib/interstitial-policy';
import {
  loadInterstitialSessionState,
  markInterstitialDismissed,
  persistInterstitialSessionState,
} from '@/features/ads/lib/interstitial-storage';
import { track } from '@/lib/analytics';
import { fetchAd } from '@/lib/api';
import { canShowFirstPartyAds } from '@/lib/consent-store';
import { getAnalyticsPlatform } from '@/lib/platform';
import { usePremium } from '@/lib/premium-store';
import type { AdPayload } from '@/lib/types';

type Props = {
  /** Increment after each completed transit search to evaluate interstitial policy. */
  trigger: number;
  /** Only fire when a search has finished (including zero-result searches). */
  ready: boolean;
};

export function InterstitialOrchestrator({ trigger, ready }: Props) {
  const isPremium = usePremium();
  const [firstPartyAd, setFirstPartyAd] = useState<AdPayload | null>(null);
  const [showFirstParty, setShowFirstParty] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);
  const runningRef = useRef(false);
  const lastTriggerRef = useRef(0);

  const dismissAll = useCallback(async () => {
    setShowFirstParty(false);
    setShowUpsell(false);
    setFirstPartyAd(null);
    setFirstPartyInterstitialVisible(false);
    await markInterstitialDismissed(Date.now());
  }, []);

  useEffect(() => {
    if (!ready || trigger === 0 || trigger === lastTriggerRef.current) {
      return;
    }
    if (!canShowFirstPartyAds(isPremium)) {
      return;
    }
    if (runningRef.current) {
      return;
    }

    lastTriggerRef.current = trigger;
    runningRef.current = true;

    void (async () => {
      try {
        const state = await loadInterstitialSessionState();
        const decision = evaluateInterstitialPolicy(state, Date.now(), Math.random());
        if (decision.nextState && Object.keys(decision.nextState).length > 0) {
          await persistInterstitialSessionState(decision.nextState);
        }
        if (!decision.show) {
          return;
        }

        const platform = getAnalyticsPlatform();
        const ad = await fetchAd({ on: 'interstitial', platform });

        if (ad) {
          setFirstPartyAd(ad);
          setShowFirstParty(true);
          setFirstPartyInterstitialVisible(true);
          void markFullScreenAdShown(Date.now());
          track('transit', 'ad_impression', { on: 'interstitial', adId: ad.id });
          return;
        }

        const canAdMob =
          Platform.OS !== 'web' &&
          isAdMobNativeAvailable() &&
          isAdMobInitialized() &&
          isInterstitialAdLoaded();

        if (canAdMob && showInterstitialAd()) {
          void markFullScreenAdShown(Date.now());
          track('transit', 'ad_mob_interstitial_shown', { on: 'interstitial' });
          return;
        }

        if (Platform.OS !== 'web') {
          setShowUpsell(true);
        }
      } finally {
        runningRef.current = false;
      }
    })();
  }, [trigger, ready, isPremium]);

  useEffect(() => {
    return onInterstitialClosed(() => {
      setShowUpsell(true);
    });
  }, []);

  return (
    <>
      {firstPartyAd ? (
        <FirstPartyInterstitialModal
          visible={showFirstParty}
          ad={firstPartyAd}
          onDismiss={() => {
            void dismissAll();
          }}
        />
      ) : null}
      <PremiumUpsellModal
        visible={showUpsell}
        onDismiss={() => {
          void dismissAll();
        }}
      />
    </>
  );
}
