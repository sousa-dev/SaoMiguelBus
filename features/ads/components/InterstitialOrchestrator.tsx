import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { InterstitialModals } from '@/features/ads/components/InterstitialModals';
import {
  isAdMobInitialized,
  isAdMobNativeAvailable,
  isInterstitialAdLoaded,
  onInterstitialClosed,
} from '@/features/ads/lib/admob-runtime';
import { markFullScreenAdShown } from '@/features/ads/lib/app-open-storage';
import {
  setFirstPartyInterstitialVisible,
  setInternalFullscreenAdVisible,
} from '@/features/ads/lib/fullscreen-ad-state';
import { planInterstitialShow } from '@/features/ads/lib/interstitial-waterfall';
import { markInterstitialDismissed } from '@/features/ads/lib/interstitial-storage';
import { shouldOpenPaywallAfterInterstitial } from '@/features/ads/lib/post-interstitial-paywall';
import type { InternalAdCreative } from '@/features/ads/lib/internal-ads/types';
import { useBootstrapCached } from '@/features/transit/hooks/useTransitQueries';
import { resolveEnabledModules } from '@/config/island';
import { usePaywall } from '@/features/premium/hooks/usePaywall';
import { track } from '@/lib/analytics';
import { useAdFreeWindow } from '@/features/ads/hooks/useAdFreeWindow';
import { usePremium } from '@/lib/premium-store';
import type { AdPayload } from '@/lib/types';

type Props = {
  /**
   * Increment each time the rider starts a search to evaluate interstitial
   * policy. Firing at the START lets the ad's planning overlap the fetch and
   * the results render underneath the ad — do not wait for results to land.
   */
  trigger: number;
  /** Gate on a search being enabled; it need not have finished. */
  ready: boolean;
};

export function InterstitialOrchestrator({ trigger, ready }: Props) {
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
  const lastTriggerRef = useRef(0);
  /**
   * `onInterstitialClosed` is a global AdMob listener, and this component is
   * mounted on several tab screens at once. Without this flag a MiniBus
   * live-entry ad would also fire every mounted orchestrator, rolling the
   * paywall more than once for a single ad.
   */
  const presentedAdMobRef = useRef(false);

  /** Coin flip after a real ad: open the paywall, or leave the user alone. */
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
    void openPaywall('post_interstitial');
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
    await markInterstitialDismissed('search', Date.now());
  }, [clearAll]);

  const onFirstPartyDismiss = useCallback(async () => {
    clearAll();
    await markInterstitialDismissed('search', Date.now());
    maybeOpenPaywall();
  }, [clearAll, maybeOpenPaywall]);

  const onInternalDismiss = useCallback(() => {
    setShowInternal(false);
    setInternalCreative(null);
    setInternalFullscreenAdVisible(false);
    void markInterstitialDismissed('search', Date.now());
    maybeOpenPaywall();
  }, [maybeOpenPaywall]);

  const applyPlan = useCallback(async (plan: Awaited<ReturnType<typeof planInterstitialShow>>) => {
    switch (plan.kind) {
      case 'none':
        return;
      case 'first_party':
        setFirstPartyAd(plan.ad);
        setShowFirstParty(true);
        setFirstPartyInterstitialVisible(true);
        void markFullScreenAdShown(Date.now());
        track('transit', 'ad_impression', { on: 'interstitial', adId: plan.ad.id });
        return;
      case 'admob':
        presentedAdMobRef.current = true;
        void markFullScreenAdShown(Date.now());
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
        break;
    }
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
        const plan = await planInterstitialShow('search', enabledModuleKeys);
        await applyPlan(plan);
      } finally {
        runningRef.current = false;
      }
    })();
  }, [applyPlan, enabledModuleKeys, ready, showAds, trigger]);

  useEffect(() => {
    return onInterstitialClosed(() => {
      if (!presentedAdMobRef.current) {
        return;
      }
      presentedAdMobRef.current = false;
      maybeOpenPaywall();
    });
  }, [maybeOpenPaywall]);

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
