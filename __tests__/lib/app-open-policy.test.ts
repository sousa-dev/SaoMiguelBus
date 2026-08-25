import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  APP_OPEN_INTERSTITIAL_COOLDOWN_MS,
  evaluateAppOpenPolicy,
  type AppOpenPolicyContext,
} from '@/features/ads/lib/app-open-policy';

const now = 1_000_000;

function baseContext(overrides: Partial<AppOpenPolicyContext> = {}): AppOpenPolicyContext {
  return {
    isPremium: false,
    isAdFreeActive: false,
    canRequestAds: true,
    consentDecided: true,
    onConsentScreen: false,
    isAdMobReady: true,
    isAppOpenLoaded: true,
    isAppOpenShowing: false,
    isInterstitialShowing: false,
    isFirstPartyInterstitialVisible: false,
    lastFullScreenAdAt: null,
    trigger: 'foreground',
    ...overrides,
  };
}

describe('evaluateAppOpenPolicy', () => {
  it('blocks premium users', () => {
    const decision = evaluateAppOpenPolicy(baseContext({ isPremium: true }), now);
    assert.equal(decision.show, false);
    assert.equal(decision.reason, 'premium');
  });

  it('blocks during rewarded ad-free window', () => {
    const decision = evaluateAppOpenPolicy(baseContext({ isAdFreeActive: true }), now);
    assert.equal(decision.show, false);
    assert.equal(decision.reason, 'ad_free_reward');
  });

  it('blocks when UMP denies ad requests', () => {
    const decision = evaluateAppOpenPolicy(baseContext({ canRequestAds: false }), now);
    assert.equal(decision.show, false);
    assert.equal(decision.reason, 'ump_denied');
  });

  it('allows when personalized ads consent is off but UMP permits ads', () => {
    const decision = evaluateAppOpenPolicy(
      baseContext({ canRequestAds: true }),
      now,
    );
    assert.equal(decision.show, true);
  });

  it('blocks when consent is undecided', () => {
    const decision = evaluateAppOpenPolicy(
      baseContext({ consentDecided: false }),
      now,
    );
    assert.equal(decision.show, false);
    assert.equal(decision.reason, 'consent_undecided');
  });

  it('blocks on consent onboarding screen', () => {
    const decision = evaluateAppOpenPolicy(
      baseContext({ onConsentScreen: true }),
      now,
    );
    assert.equal(decision.show, false);
    assert.equal(decision.reason, 'consent_screen');
  });

  it('blocks cold start even when otherwise eligible and loaded', () => {
    const decision = evaluateAppOpenPolicy(
      baseContext({ trigger: 'cold_start' }),
      now,
    );
    assert.equal(decision.show, false);
    assert.equal(decision.reason, 'cold_start');
  });

  it('allows foreground return when eligible and loaded', () => {
    const decision = evaluateAppOpenPolicy(
      baseContext({ trigger: 'foreground' }),
      now,
    );
    assert.equal(decision.show, true);
  });

  it('blocks within interstitial cooldown window', () => {
    const decision = evaluateAppOpenPolicy(
      baseContext({
        lastFullScreenAdAt: now - APP_OPEN_INTERSTITIAL_COOLDOWN_MS + 1,
      }),
      now,
    );
    assert.equal(decision.show, false);
    assert.equal(decision.reason, 'cooldown');
  });

  it('blocks when app open is already showing', () => {
    const decision = evaluateAppOpenPolicy(
      baseContext({ isAppOpenShowing: true }),
      now,
    );
    assert.equal(decision.show, false);
    assert.equal(decision.reason, 'already_showing');
  });

  it('blocks when ad is not loaded', () => {
    const decision = evaluateAppOpenPolicy(
      baseContext({ isAppOpenLoaded: false }),
      now,
    );
    assert.equal(decision.show, false);
    assert.equal(decision.reason, 'not_loaded');
  });

  it('blocks when interstitial is showing', () => {
    const decision = evaluateAppOpenPolicy(
      baseContext({ isInterstitialShowing: true }),
      now,
    );
    assert.equal(decision.show, false);
    assert.equal(decision.reason, 'other_fullscreen_active');
  });
});
