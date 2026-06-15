import { useSegments } from 'expo-router';
import React, { useCallback, useEffect, useRef } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';

import {
  evaluateAppOpenPolicy,
  type AppOpenTrigger,
} from '@/features/ads/lib/app-open-policy';
import { loadLastFullScreenAdAt, markFullScreenAdShown } from '@/features/ads/lib/app-open-storage';
import {
  initializeAdMob,
  isAdMobInitialized,
  isAdMobNativeAvailable,
  isAppOpenAdLoaded,
  isAppOpenShowing,
  isInterstitialShowing,
  onAppOpenClosed,
  showAppOpenAd,
} from '@/features/ads/lib/admob-runtime';
import { isFirstPartyInterstitialVisible } from '@/features/ads/lib/fullscreen-ad-state';
import { track } from '@/lib/analytics';
import { canShowExternalAds, canShowFirstPartyAds, useConsentStore } from '@/lib/consent-store';
import { usePremium } from '@/lib/premium-store';

const LOAD_TIMEOUT_MS = 3_000;
const LOAD_POLL_MS = 200;

type Props = {
  appReady: boolean;
  onSplashDismiss: () => void;
};

function isEligible(isPremium: boolean, canShowAds: boolean): boolean {
  return (
    Platform.OS !== 'web' &&
    isAdMobNativeAvailable() &&
    !isPremium &&
    canShowAds
  );
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
  const adsConsent = useConsentStore((s) => s.purposes.ads);
  const segments = useSegments();
  const onConsentScreen = segments[0] === 'onboarding';

  const runningRef = useRef(false);
  const coldStartDoneRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const canShowAds = consentDecided && adsConsent;
  const eligible = isEligible(isPremium, canShowAds);

  const attemptShow = useCallback(
    async (trigger: AppOpenTrigger, dismissSplashOnComplete: boolean) => {
      if (runningRef.current) {
        return;
      }
      runningRef.current = true;

      try {
        if (!eligible) {
          if (dismissSplashOnComplete) {
            onSplashDismiss();
          }
          return;
        }

        await initializeAdMob();

        if (!isAdMobInitialized()) {
          if (dismissSplashOnComplete) {
            onSplashDismiss();
          }
          return;
        }

        if (!isAppOpenAdLoaded()) {
          await waitForAppOpenLoaded(LOAD_TIMEOUT_MS);
        }

        const lastFullScreenAdAt = await loadLastFullScreenAdAt();
        const decision = evaluateAppOpenPolicy(
          {
            isPremium,
            canShowExternalAds: canShowExternalAds(),
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

        if (!decision.show) {
          if (dismissSplashOnComplete) {
            onSplashDismiss();
          }
          return;
        }

        const shown = showAppOpenAd();
        if (!shown) {
          if (dismissSplashOnComplete) {
            onSplashDismiss();
          }
          return;
        }

        await markFullScreenAdShown(Date.now());
        track('transit', 'ad_mob_app_open_shown', { trigger });

        if (dismissSplashOnComplete) {
          onSplashDismiss();
        }
      } finally {
        runningRef.current = false;
      }
    },
    [
      eligible,
      isPremium,
      consentDecided,
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

    if (!eligible) {
      coldStartDoneRef.current = true;
      onSplashDismiss();
      return;
    }

    coldStartDoneRef.current = true;
    void attemptShow('cold_start', true);
  }, [
    appReady,
    consentDecided,
    onConsentScreen,
    eligible,
    attemptShow,
    onSplashDismiss,
  ]);

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
  }, [appReady, consentDecided, onConsentScreen, attemptShow]);

  useEffect(() => {
    return onAppOpenClosed(() => {
      // Next preload happens in admob-runtime after close.
    });
  }, []);

  return null;
}
