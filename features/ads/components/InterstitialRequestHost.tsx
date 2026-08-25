import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';

import { InterstitialModals } from '@/features/ads/components/InterstitialModals';
import { useAdFreeWindow } from '@/features/ads/hooks/useAdFreeWindow';
import { markFullScreenAdShown } from '@/features/ads/lib/app-open-storage';
import { showInterstitialAdAndWait } from '@/features/ads/lib/admob-runtime';
import {
  setFirstPartyInterstitialVisible,
  setInternalFullscreenAdVisible,
} from '@/features/ads/lib/fullscreen-ad-state';
import {
  completeInterstitialRequest,
  subscribeInterstitialRequests,
} from '@/features/ads/lib/interstitial-request';
import { planInterstitialShow } from '@/features/ads/lib/interstitial-waterfall';
import { markInterstitialDismissed } from '@/features/ads/lib/interstitial-storage';
import { shouldOpenPaywallAfterInterstitial } from '@/features/ads/lib/post-interstitial-paywall';
import type { InternalAdCreative } from '@/features/ads/lib/internal-ads/types';
import { useBootstrapCached } from '@/features/transit/hooks/useTransitQueries';
import { resolveEnabledModules } from '@/config/island';
import { usePaywall } from '@/features/premium/hooks/usePaywall';
import { track } from '@/lib/analytics';
import { usePremium } from '@/lib/premium-store';
import type { AdPayload } from '@/lib/types';

/**
 * Handles interstitial requests from outside search flows (e.g. minibus live entry).
 * Mount once at app root.
 */
export function InterstitialRequestHost() {
  const { showAds, isAdFreeActive } = useAdFreeWindow();
  const isPremium = usePremium();
  const { openPaywall } = usePaywall();
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
  const awaitingExternalRef = useRef(false);

  const finishPresentation = useCallback(async () => {
    if (awaitingExternalRef.current) {
      awaitingExternalRef.current = false;
      completeInterstitialRequest();
    }
    await markInterstitialDismissed('live_entry', Date.now());
  }, []);

  /**
   * Coin flip after a real ad. Dismissing this interstitial also releases the
   * pending live-map navigation, so wait for that push to settle before
   * presenting the paywall over it.
   */
  const maybeOpenPaywall = useCallback(() => {
    const open = shouldOpenPaywallAfterInterstitial({
      isPremium,
      isAdFreeActive,
      showedRealAd: true,
      randomValue: Math.random(),
    });
    if (!open) {
      return;
    }
    InteractionManager.runAfterInteractions(() => {
      void openPaywall('post_interstitial_live_entry');
    });
  }, [isAdFreeActive, isPremium, openPaywall]);

  const clearAll = useCallback(() => {
    setShowFirstParty(false);
    setShowInternal(false);
    setShowUpsell(false);
    setFirstPartyAd(null);
    setInternalCreative(null);
    setFirstPartyInterstitialVisible(false);
    setInternalFullscreenAdVisible(false);
  }, []);

  /** The upsell modal is the fallback ad itself — no paywall roll on top. */
  const onUpsellDismiss = useCallback(async () => {
    clearAll();
    await finishPresentation();
  }, [clearAll, finishPresentation]);

  const onFirstPartyDismiss = useCallback(async () => {
    clearAll();
    await finishPresentation();
    maybeOpenPaywall();
  }, [clearAll, finishPresentation, maybeOpenPaywall]);

  const onInternalDismiss = useCallback(() => {
    setShowInternal(false);
    setInternalCreative(null);
    setInternalFullscreenAdVisible(false);
    void finishPresentation();
    maybeOpenPaywall();
  }, [finishPresentation, maybeOpenPaywall]);

  const applyPlan = useCallback(
    async (plan: Awaited<ReturnType<typeof planInterstitialShow>>) => {
      switch (plan.kind) {
        case 'none':
          awaitingExternalRef.current = false;
          completeInterstitialRequest();
          return;
        case 'first_party':
          setFirstPartyAd(plan.ad);
          setShowFirstParty(true);
          setFirstPartyInterstitialVisible(true);
          void markFullScreenAdShown(Date.now());
          track('transit', 'ad_impression', { on: 'interstitial', adId: plan.ad.id, intent: 'live_entry' });
          return;
        case 'admob':
          return;
        case 'internal':
          setInternalCreative(plan.creative);
          setShowInternal(true);
          setInternalFullscreenAdVisible(true);
          void markFullScreenAdShown(Date.now());
          return;
        case 'upsell':
          setShowUpsell(true);
          return;
        default:
          awaitingExternalRef.current = false;
          completeInterstitialRequest();
      }
    },
    [],
  );

  useEffect(() => {
    return subscribeInterstitialRequests((intent) => {
      if (!showAds || runningRef.current) {
        completeInterstitialRequest();
        return;
      }
      if (intent !== 'live_entry') {
        return;
      }

      runningRef.current = true;
      awaitingExternalRef.current = true;

      void (async () => {
        try {
          const plan = await planInterstitialShow(intent, enabledModuleKeys, {
            deferAdMobPresentation: true,
          });
          await applyPlan(plan);

          if (plan.kind === 'admob') {
            const shown = await showInterstitialAdAndWait();
            if (shown) {
              void markFullScreenAdShown(Date.now());
              track('transit', 'ad_mob_interstitial_shown', { on: 'interstitial', intent: 'live_entry' });
            }
            await finishPresentation();
            if (shown) {
              maybeOpenPaywall();
            }
            return;
          }

          if (plan.kind === 'none') {
            return;
          }
        } finally {
          runningRef.current = false;
        }
      })();
    });
  }, [applyPlan, enabledModuleKeys, finishPresentation, maybeOpenPaywall, showAds]);

  return (
    <InterstitialModals
      firstPartyAd={firstPartyAd}
      showFirstParty={showFirstParty}
      internalCreative={internalCreative}
      showInternal={showInternal}
      showUpsell={showUpsell}
      onFirstPartyDismiss={() => {
        void onFirstPartyDismiss();
      }}
      onInternalDismiss={onInternalDismiss}
      onUpsellDismiss={() => {
        void onUpsellDismiss();
      }}
    />
  );
}
