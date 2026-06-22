import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  evaluateAppOpenPolicy,
  evaluateInternalAppOpenPolicy,
  APP_OPEN_INTERSTITIAL_COOLDOWN_MS,
} from '@/features/ads/lib/app-open-policy';

const now = 1_000_000;

describe('evaluateInternalAppOpenPolicy', () => {
  it('allows when eligible without AdMob requirements', () => {
    const decision = evaluateInternalAppOpenPolicy(
      {
        isPremium: false,
        isAdFreeActive: false,
        consentDecided: true,
        onConsentScreen: false,
        isInternalFullscreenVisible: false,
        isInterstitialShowing: false,
        isFirstPartyInterstitialVisible: false,
        lastFullScreenAdAt: null,
      },
      now,
    );
    assert.equal(decision.show, true);
  });

  it('blocks within interstitial cooldown window', () => {
    const decision = evaluateInternalAppOpenPolicy(
      {
        isPremium: false,
        isAdFreeActive: false,
        consentDecided: true,
        onConsentScreen: false,
        isInternalFullscreenVisible: false,
        isInterstitialShowing: false,
        isFirstPartyInterstitialVisible: false,
        lastFullScreenAdAt: now - APP_OPEN_INTERSTITIAL_COOLDOWN_MS + 1,
      },
      now,
    );
    assert.equal(decision.show, false);
    assert.equal(decision.reason, 'cooldown');
  });

  it('blocks premium users', () => {
    const decision = evaluateInternalAppOpenPolicy(
      {
        isPremium: true,
        isAdFreeActive: false,
        consentDecided: true,
        onConsentScreen: false,
        isInternalFullscreenVisible: false,
        isInterstitialShowing: false,
        isFirstPartyInterstitialVisible: false,
        lastFullScreenAdAt: null,
      },
      now,
    );
    assert.equal(decision.show, false);
    assert.equal(decision.reason, 'premium');
  });
  it('blocks during rewarded ad-free window', () => {
    const decision = evaluateInternalAppOpenPolicy(
      {
        isPremium: false,
        isAdFreeActive: true,
        consentDecided: true,
        onConsentScreen: false,
        isInternalFullscreenVisible: false,
        isInterstitialShowing: false,
        isFirstPartyInterstitialVisible: false,
        lastFullScreenAdAt: null,
      },
      now,
    );
    assert.equal(decision.show, false);
    assert.equal(decision.reason, 'ad_free_reward');
  });
});

describe('evaluateAppOpenPolicy regression', () => {
  it('still requires AdMob loaded for third-party app open', () => {
    const decision = evaluateAppOpenPolicy(
      {
        isPremium: false,
        isAdFreeActive: false,
        canRequestAds: true,
        consentDecided: true,
        onConsentScreen: false,
        isAdMobReady: true,
        isAppOpenLoaded: false,
        isAppOpenShowing: false,
        isInterstitialShowing: false,
        isFirstPartyInterstitialVisible: false,
        lastFullScreenAdAt: null,
        trigger: 'cold_start',
      },
      now,
    );
    assert.equal(decision.show, false);
    assert.equal(decision.reason, 'not_loaded');
  });
});
