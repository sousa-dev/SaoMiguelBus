import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { InterstitialModals } from '@/features/ads/components/InterstitialModals';
import { useAdFreeWindow } from '@/features/ads/hooks/useAdFreeWindow';
import { markFullScreenAdShown } from '@/features/ads/lib/app-open-storage';
import { onInterstitialClosed } from '@/features/ads/lib/admob-runtime';
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
import type { InternalAdCreative } from '@/features/ads/lib/internal-ads/types';
import { useBootstrapCached } from '@/features/transit/hooks/useTransitQueries';
import { resolveEnabledModules } from '@/config/island';
import { track } from '@/lib/analytics';
import type { AdPayload } from '@/lib/types';

/**
 * Handles interstitial requests from outside search flows (e.g. minibus live entry).
 * Mount once at app root.
 */
export function InterstitialRequestHost() {
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
  const awaitingExternalRef = useRef(false);

  const finishPresentation = useCallback(async () => {
    if (awaitingExternalRef.current) {
      awaitingExternalRef.current = false;
      completeInterstitialRequest();
    }
    await markInterstitialDismissed(Date.now());
  }, []);

  const dismissAll = useCallback(async () => {
    setShowFirstParty(false);
    setShowInternal(false);
    setShowUpsell(false);
    setFirstPartyAd(null);
    setInternalCreative(null);
    setFirstPartyInterstitialVisible(false);
    setInternalFullscreenAdVisible(false);
    await finishPresentation();
  }, [finishPresentation]);

  const onInternalDismiss = useCallback(() => {
    setShowInternal(false);
    setInternalCreative(null);
    setInternalFullscreenAdVisible(false);
    // Unblock live-entry navigation before optional upsell.
    void finishPresentation();
    setShowUpsell(true);
  }, [finishPresentation]);

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
          const plan = await planInterstitialShow(intent, enabledModuleKeys);
          await applyPlan(plan);
          if (plan.kind === 'admob') {
            // Upsell follows AdMob close via onInterstitialClosed.
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
  }, [applyPlan, enabledModuleKeys, showAds]);

  useEffect(() => {
    return onInterstitialClosed(() => {
      if (!awaitingExternalRef.current) {
        return;
      }
      // AdMob close must unblock router.push('/minibus/live') before upsell.
      void finishPresentation();
      setShowUpsell(true);
    });
  }, [finishPresentation]);

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
