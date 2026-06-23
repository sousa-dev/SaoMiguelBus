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
import type { InternalAdCreative } from '@/features/ads/lib/internal-ads/types';
import { useBootstrapCached } from '@/features/transit/hooks/useTransitQueries';
import { resolveEnabledModules } from '@/config/island';
import { track } from '@/lib/analytics';
import { useAdFreeWindow } from '@/features/ads/hooks/useAdFreeWindow';
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
      setShowUpsell(true);
    });
  }, []);

  return (
    <InterstitialModals
      firstPartyAd={firstPartyAd}
      showFirstParty={showFirstParty}
      internalCreative={internalCreative}
      showInternal={showInternal}
      showUpsell={showUpsell}
      onFirstPartyDismiss={() => {
        void dismissAll();
      }}
      onInternalDismiss={onInternalDismiss}
      onUpsellDismiss={() => {
        void dismissAll();
      }}
    />
  );
}
