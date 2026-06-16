import { useSegments } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';

import { InternalFullscreenAdModal } from '@/features/ads/components/InternalFullscreenAdModal';
import {
  evaluateAppOpenPolicy,
  evaluateInternalAppOpenPolicy,
  type AppOpenTrigger,
} from '@/features/ads/lib/app-open-policy';
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
import { canInitAdMob, canShowFirstPartyAds, useConsentStore } from '@/lib/consent-store';
import { usePremium } from '@/lib/premium-store';

const LOAD_TIMEOUT_MS = 3_000;
const LOAD_POLL_MS = 200;

type Props = {
  appReady: boolean;
  onSplashDismiss: () => void;
};

function isAdMobEligible(isPremium: boolean): boolean {
  return Platform.OS !== 'web' && isAdMobNativeAvailable() && canInitAdMob(isPremium);
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
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const admobEligible = isAdMobEligible(isPremium);
  const canShowAds = canShowFirstPartyAds(isPremium);

  const dismissInternal = useCallback(() => {
    setShowInternal(false);
    setInternalCreative(null);
    setInternalFullscreenAdVisible(false);
  }, []);

  const attemptInternalAppOpen = useCallback(
    async (trigger: AppOpenTrigger, dismissSplashOnComplete: boolean) => {
      if (!canShowAds || Platform.OS === 'web') {
        if (dismissSplashOnComplete) {
          onSplashDismiss();
        }
        return false;
      }

      const lastFullScreenAdAt = await loadLastFullScreenAdAt();
      const decision = evaluateInternalAppOpenPolicy(
        {
          isPremium,
          consentDecided,
          onConsentScreen,
          isInternalFullscreenVisible: isInternalFullscreenAdVisible() || showInternal,
          isInterstitialShowing: isInterstitialShowing(),
          isFirstPartyInterstitialVisible: isFirstPartyInterstitialVisible(),
          lastFullScreenAdAt,
        },
        Date.now(),
      );

      if (!decision.show) {
        if (dismissSplashOnComplete) {
          onSplashDismiss();
        }
        return false;
      }

      const creative = selectInternalCreative({
        slotKey: `app_open:${trigger}`,
        enabledModuleKeys,
      });
      if (!creative) {
        if (dismissSplashOnComplete) {
          onSplashDismiss();
        }
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

      if (dismissSplashOnComplete) {
        onSplashDismiss();
      }
      return true;
    },
    [
      canShowAds,
      consentDecided,
      enabledModuleKeys,
      isPremium,
      onConsentScreen,
      onSplashDismiss,
      showInternal,
    ],
  );

  const attemptShow = useCallback(
    async (trigger: AppOpenTrigger, dismissSplashOnComplete: boolean) => {
      if (runningRef.current) {
        return;
      }
      runningRef.current = true;

      try {
        if (!canShowAds || !consentDecided || onConsentScreen) {
          if (dismissSplashOnComplete) {
            onSplashDismiss();
          }
          return;
        }

        if (shouldForceInternalAds()) {
          await attemptInternalAppOpen(trigger, dismissSplashOnComplete);
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
                if (dismissSplashOnComplete) {
                  onSplashDismiss();
                }
                return;
              }
            }
          }
        }

        await attemptInternalAppOpen(trigger, dismissSplashOnComplete);
      } finally {
        runningRef.current = false;
      }
    },
    [
      admobEligible,
      attemptInternalAppOpen,
      canShowAds,
      consentDecided,
      isPremium,
      onConsentScreen,
      onSplashDismiss,
    ],
  );

  useEffect(() => {
    if (!appReady || coldStartDoneRef.current) {
      return;
    }

    if (!consentDecided) {
      onSplashDismiss();
      return;
    }

    if (onConsentScreen) {
      onSplashDismiss();
      return;
    }

    if (!canShowAds) {
      coldStartDoneRef.current = true;
      onSplashDismiss();
      return;
    }

    coldStartDoneRef.current = true;
    void attemptShow('cold_start', true);
  }, [appReady, attemptShow, canShowAds, consentDecided, onConsentScreen, onSplashDismiss]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      if (
        prevState.match(/inactive|background/) &&
        nextState === 'active' &&
        appReady &&
        consentDecided &&
        !onConsentScreen
      ) {
        void attemptShow('foreground', false);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [appReady, attemptShow, consentDecided, onConsentScreen]);

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
