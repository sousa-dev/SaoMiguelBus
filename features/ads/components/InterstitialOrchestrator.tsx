import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { FirstPartyInterstitialModal } from '@/features/ads/components/FirstPartyInterstitialModal';
import { InternalFullscreenAdModal } from '@/features/ads/components/InternalFullscreenAdModal';
import { PremiumUpsellModal } from '@/features/ads/components/PremiumUpsellModal';
import {
  isAdMobInitialized,
  isAdMobNativeAvailable,
  isInterstitialAdLoaded,
  onInterstitialClosed,
  showInterstitialAd,
} from '@/features/ads/lib/admob-runtime';
import { markFullScreenAdShown } from '@/features/ads/lib/app-open-storage';
import { shouldForceInternalAds } from '@/features/ads/lib/force-internal-ads';
import {
  setFirstPartyInterstitialVisible,
  setInternalFullscreenAdVisible,
} from '@/features/ads/lib/fullscreen-ad-state';
import { selectInternalCreative } from '@/features/ads/lib/internal-ads/select-creative';
import type { InternalAdCreative } from '@/features/ads/lib/internal-ads/types';
import { evaluateInterstitialPolicy } from '@/features/ads/lib/interstitial-policy';
import {
  loadInterstitialSessionState,
  markInterstitialDismissed,
  persistInterstitialSessionState,
} from '@/features/ads/lib/interstitial-storage';
import { useBootstrapCached } from '@/features/transit/hooks/useTransitQueries';
import { resolveEnabledModules } from '@/config/island';
import { track } from '@/lib/analytics';
import { fetchAd } from '@/lib/api';
import { useAdFreeWindow } from '@/features/ads/hooks/useAdFreeWindow';
import { getAnalyticsPlatform } from '@/lib/platform';
import type { AdPayload } from '@/lib/types';

type Props = {
  /** Increment after each completed transit search to evaluate interstitial policy. */
  trigger: number;
  /** Only fire when a search has finished (including zero-result searches). */
  ready: boolean;
};

export function InterstitialOrchestrator({ trigger, ready }: Props) {
  const { showAds } = useAdFreeWindow();
  const { data: bootstrap } = useBootstrapCached();
  const enabledModuleKeys = useMemo(
    () => resolveEnabledModules(bootstrap?.island?.enabledModules),
    [bootstrap?.island?.enabledModules],
  );

  const [firstPartyAd, setFirstPartyAd] = useState<AdPayload | null>(null);
  const [showFirstParty, setShowFirstParty] = useState(false);
  const [internalCreative, setInternalCreative] = useState<InternalAdCreative | null>(null);
  const [showInternal, setShowInternal] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);
  const runningRef = useRef(false);
  const lastTriggerRef = useRef(0);

  const showInternalInterstitial = useCallback(
    (creative: InternalAdCreative) => {
      setInternalCreative(creative);
      setShowInternal(true);
      setInternalFullscreenAdVisible(true);
      void markFullScreenAdShown(Date.now());
    },
    [],
  );

  const dismissAll = useCallback(async () => {
    setShowFirstParty(false);
    setShowInternal(false);
    setShowUpsell(false);
    setFirstPartyAd(null);
    setInternalCreative(null);
    setFirstPartyInterstitialVisible(false);
    setInternalFullscreenAdVisible(false);
    await markInterstitialDismissed(Date.now());
  }, []);

  const onInternalDismiss = useCallback(() => {
    setShowInternal(false);
    setInternalCreative(null);
    setInternalFullscreenAdVisible(false);
    setShowUpsell(true);
    void markInterstitialDismissed(Date.now());
  }, []);

  useEffect(() => {
    if (!ready || trigger === 0 || trigger === lastTriggerRef.current) {
      return;
    }
    if (!showAds) {
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

        if (shouldForceInternalAds()) {
          const creative = selectInternalCreative({
            slotKey: 'interstitial:forced',
            enabledModuleKeys,
          });
          if (creative && Platform.OS !== 'web') {
            showInternalInterstitial(creative);
          } else if (Platform.OS !== 'web') {
            setShowUpsell(true);
          }
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
          const creative = selectInternalCreative({
            slotKey: 'interstitial:fallback',
            enabledModuleKeys,
          });
          if (creative) {
            showInternalInterstitial(creative);
          } else {
            setShowUpsell(true);
          }
        }
      } finally {
        runningRef.current = false;
      }
    })();
  }, [enabledModuleKeys, ready, showAds, showInternalInterstitial, trigger]);

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
      {internalCreative ? (
        <InternalFullscreenAdModal
          visible={showInternal}
          creative={internalCreative}
          surface="interstitial"
          onDismiss={onInternalDismiss}
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
