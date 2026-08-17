/** Minimum gap between App Open and interstitial full-screen ads. */
export const APP_OPEN_INTERSTITIAL_COOLDOWN_MS = 2 * 60 * 1000;

export type AppOpenTrigger = 'cold_start' | 'foreground';

export type AppOpenPolicyContext = {
  isPremium: boolean;
  isAdFreeActive: boolean;
  canRequestAds: boolean;
  consentDecided: boolean;
  onConsentScreen: boolean;
  isAdMobReady: boolean;
  isAppOpenLoaded: boolean;
  isAppOpenShowing: boolean;
  isInterstitialShowing: boolean;
  isFirstPartyInterstitialVisible: boolean;
  lastFullScreenAdAt: number | null;
  trigger: AppOpenTrigger;
};

export type AppOpenPolicyDecision = {
  show: boolean;
  reason?: string;
};

export type InternalAppOpenPolicyContext = {
  isPremium: boolean;
  isAdFreeActive: boolean;
  consentDecided: boolean;
  onConsentScreen: boolean;
  isInternalFullscreenVisible: boolean;
  isInterstitialShowing: boolean;
  isFirstPartyInterstitialVisible: boolean;
  lastFullScreenAdAt: number | null;
  trigger: AppOpenTrigger;
};

export function evaluateInternalAppOpenPolicy(
  context: InternalAppOpenPolicyContext,
  nowMs: number,
): AppOpenPolicyDecision {
  if (context.trigger === 'cold_start') {
    return { show: false, reason: 'cold_start' };
  }
  if (context.isPremium) {
    return { show: false, reason: 'premium' };
  }
  if (context.isAdFreeActive) {
    return { show: false, reason: 'ad_free_reward' };
  }
  if (!context.consentDecided) {
    return { show: false, reason: 'consent_undecided' };
  }
  if (context.onConsentScreen) {
    return { show: false, reason: 'consent_screen' };
  }
  if (context.isInternalFullscreenVisible) {
    return { show: false, reason: 'already_showing' };
  }
  if (context.isInterstitialShowing || context.isFirstPartyInterstitialVisible) {
    return { show: false, reason: 'other_fullscreen_active' };
  }

  if (context.lastFullScreenAdAt != null) {
    const elapsed = nowMs - context.lastFullScreenAdAt;
    if (elapsed < APP_OPEN_INTERSTITIAL_COOLDOWN_MS) {
      return { show: false, reason: 'cooldown' };
    }
  }

  return { show: true };
}

export function evaluateAppOpenPolicy(
  context: AppOpenPolicyContext,
  nowMs: number,
): AppOpenPolicyDecision {
  if (context.trigger === 'cold_start') {
    return { show: false, reason: 'cold_start' };
  }
  if (context.isPremium) {
    return { show: false, reason: 'premium' };
  }
  if (context.isAdFreeActive) {
    return { show: false, reason: 'ad_free_reward' };
  }
  if (!context.consentDecided) {
    return { show: false, reason: 'consent_undecided' };
  }
  if (!context.canRequestAds) {
    return { show: false, reason: 'ump_denied' };
  }
  if (context.onConsentScreen) {
    return { show: false, reason: 'consent_screen' };
  }
  if (!context.isAdMobReady) {
    return { show: false, reason: 'admob_not_ready' };
  }
  if (!context.isAppOpenLoaded) {
    return { show: false, reason: 'not_loaded' };
  }
  if (context.isAppOpenShowing) {
    return { show: false, reason: 'already_showing' };
  }
  if (context.isInterstitialShowing || context.isFirstPartyInterstitialVisible) {
    return { show: false, reason: 'other_fullscreen_active' };
  }

  if (context.lastFullScreenAdAt != null) {
    const elapsed = nowMs - context.lastFullScreenAdAt;
    if (elapsed < APP_OPEN_INTERSTITIAL_COOLDOWN_MS) {
      return { show: false, reason: 'cooldown' };
    }
  }

  return { show: true };
}
