import { useSegments } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { InternalFullscreenAdModal } from '@/features/ads/components/InternalFullscreenAdModal';
import {
  evaluateAppOpenPolicy,
  evaluateInternalAppOpenPolicy,
  type AppOpenTrigger,
} from '@/features/ads/lib/app-open-policy';
import { shouldTreatAsForegroundReturn } from '@/features/ads/lib/app-open-trigger';
import { loadLastFullScreenAdAt, markFullScreenAdShown } from '@/features/ads/lib/app-open-storage';
import { shouldForceInternalAds } from '@/features/ads/lib/force-internal-ads';
import {
  initializeAdMob,
  isAdMobCanRequestAds,
  isAdMobInitialized,
  isAdMobNativeAvailable,
  isAppOpenAdLoaded,
  isAppOpenShowing,
  isInterstitialShowing,
  onAppOpenClosed,
  showAppOpenAd,
} from '@/features/ads/lib/admob-runtime';
import {
  isFirstPartyInterstitialVisible,
  isInternalFullscreenAdVisible,
  setInternalFullscreenAdVisible,
} from '@/features/ads/lib/fullscreen-ad-state';
import { selectInternalCreative } from '@/features/ads/lib/internal-ads/select-creative';
import type { InternalAdCreative } from '@/features/ads/lib/internal-ads/types';
import { useBootstrapCached } from '@/features/transit/hooks/useTransitQueries';
import { resolveEnabledModules } from '@/config/island';
import { track } from '@/lib/analytics';
import { useAdFreeWindow } from '@/features/ads/hooks/useAdFreeWindow';
import { canInitAdMob, useConsentStore } from '@/lib/consent-store';
import { usePremium } from '@/lib/premium-store';

const LOAD_TIMEOUT_MS = 3_000;
const LOAD_POLL_MS = 200;

/** Process start, captured at module load — before any component mounts. */
const LAUNCHED_AT = Date.now();

type Props = {
  appReady: boolean;
  onSplashDismiss: () => void;
};

function isAdMobEligible(showAds: boolean): boolean {
  return Platform.OS !== 'web' && isAdMobNativeAvailable() && canInitAdMob(showAds);
}

async function waitForAppOpenLoaded(timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (isAppOpenAdLoaded()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, LOAD_POLL_MS));
  }
  return isAppOpenAdLoaded();
}

export function AppOpenOrchestrator({ appReady, onSplashDismiss }: Props) {
  const { showAds, hydrated, isAdFreeActive } = useAdFreeWindow();
  const isPremium = usePremium();
  const consentDecided = useConsentStore((s) => s.decided);
  const segments = useSegments();
  const onConsentScreen = segments[0] === 'onboarding';
  const { data: bootstrap } = useBootstrapCached();
  const enabledModuleKeys = useMemo(
    () => resolveEnabledModules(bootstrap?.island?.enabledModules),
    [bootstrap?.island?.enabledModules],
  );

  const [internalCreative, setInternalCreative] = useState<InternalAdCreative | null>(null);
  const [showInternal, setShowInternal] = useState(false);

  const runningRef = useRef(false);
  const coldStartDoneRef = useRef(false);
  const wasBackgroundedRef = useRef(false);

  const admobEligible = isAdMobEligible(showAds);
  const canShowAds = showAds;

  const dismissInternal = useCallback(() => {
    setShowInternal(false);
    setInternalCreative(null);
    setInternalFullscreenAdVisible(false);
  }, []);

  const attemptInternalAppOpen = useCallback(
    async (trigger: AppOpenTrigger) => {
      if (!canShowAds || Platform.OS === 'web') {
        return false;
      }

      const lastFullScreenAdAt = await loadLastFullScreenAdAt();
      const decision = evaluateInternalAppOpenPolicy(
        {
          isPremium,
          isAdFreeActive,
          consentDecided,
          onConsentScreen,
          isInternalFullscreenVisible: isInternalFullscreenAdVisible() || showInternal,
          isInterstitialShowing: isInterstitialShowing(),
          isFirstPartyInterstitialVisible: isFirstPartyInterstitialVisible(),
          lastFullScreenAdAt,
          trigger,
        },
        Date.now(),
      );

      if (!decision.show) {
        return false;
      }

      const creative = selectInternalCreative({
        slotKey: `app_open:${trigger}`,
        enabledModuleKeys,
      });
      if (!creative) {
        return false;
      }

      setInternalCreative(creative);
      setShowInternal(true);
      setInternalFullscreenAdVisible(true);
      await markFullScreenAdShown(Date.now());
      track('transit', 'internal_ad_impression', {
        creativeId: creative.id,
        kind: creative.kind,
        moduleKey: creative.moduleKey,
        surface: 'app_open',
        trigger,
      });

      return true;
    },
    [
      canShowAds,
      consentDecided,
      enabledModuleKeys,
      isAdFreeActive,
      isPremium,
      onConsentScreen,
      showInternal,
    ],
  );

  const attemptShow = useCallback(
    async (trigger: AppOpenTrigger) => {
      if (runningRef.current) {
        return;
      }
      runningRef.current = true;

      try {
        if (!canShowAds || !consentDecided || onConsentScreen) {
          return;
        }

        if (shouldForceInternalAds()) {
          await attemptInternalAppOpen(trigger);
          return;
        }

        if (admobEligible) {
          await initializeAdMob();

          if (isAdMobInitialized()) {
            if (!isAppOpenAdLoaded()) {
              await waitForAppOpenLoaded(LOAD_TIMEOUT_MS);
            }

            const lastFullScreenAdAt = await loadLastFullScreenAdAt();
            const decision = evaluateAppOpenPolicy(
              {
                isPremium,
                isAdFreeActive,
                canRequestAds: isAdMobCanRequestAds(),
                consentDecided,
                onConsentScreen,
                isAdMobReady: isAdMobInitialized(),
                isAppOpenLoaded: isAppOpenAdLoaded(),
                isAppOpenShowing: isAppOpenShowing(),
                isInterstitialShowing: isInterstitialShowing(),
                isFirstPartyInterstitialVisible: isFirstPartyInterstitialVisible(),
                lastFullScreenAdAt,
                trigger,
              },
              Date.now(),
            );

            if (decision.show) {
              const shown = showAppOpenAd();
              if (shown) {
                await markFullScreenAdShown(Date.now());
                track('transit', 'ad_mob_app_open_shown', { trigger });
                return;
              }
            }
          }
        }

        await attemptInternalAppOpen(trigger);
      } finally {
        runningRef.current = false;
      }
    },
    [
      admobEligible,
      attemptInternalAppOpen,
      canShowAds,
      consentDecided,
      isAdFreeActive,
      isPremium,
      onConsentScreen,
    ],
  );

  // Cold start never shows a full-screen app-open ad; only returning from
  // background does. Release the splash as soon as the app is ready.
  useEffect(() => {
    if (!appReady || coldStartDoneRef.current) {
      return;
    }

    if (!hydrated) {
      return;
    }

    coldStartDoneRef.current = true;
    onSplashDismiss();
  }, [appReady, hydrated, onSplashDismiss]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background') {
        wasBackgroundedRef.current = true;
        return;
      }

      const isForegroundReturn = shouldTreatAsForegroundReturn({
        wasBackgrounded: wasBackgroundedRef.current,
        nextState,
        msSinceLaunch: Date.now() - LAUNCHED_AT,
      });

      if (nextState === 'active') {
        wasBackgroundedRef.current = false;
      }

      if (isForegroundReturn && appReady && hydrated && consentDecided && !onConsentScreen) {
        void attemptShow('foreground');
      }
    });

    return () => {
      subscription.remove();
    };
  }, [appReady, attemptShow, consentDecided, hydrated, onConsentScreen]);

  useEffect(() => {
    return onAppOpenClosed(() => {
      // Next preload happens in admob-runtime after close.
    });
  }, []);

  return internalCreative ? (
    <InternalFullscreenAdModal
      visible={showInternal}
      creative={internalCreative}
      surface="app_open"
      onDismiss={dismissInternal}
    />
  ) : null;
}
