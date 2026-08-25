import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  INTERSTITIAL_COOLDOWN_MS,
  INTERSTITIAL_SUBSEQUENT_PROBABILITY,
  evaluateInterstitialPolicy,
  type InterstitialSessionState,
} from '@/features/ads/lib/interstitial-policy';

const baseState: InterstitialSessionState = {
  hasShownThisSession: false,
  sessionDismissed: false,
  dismissedAt: null,
};

describe('evaluateInterstitialPolicy', () => {
  it('always shows on the first qualifying event of a session', () => {
    const decision = evaluateInterstitialPolicy(baseState, 1_000, 0.99);
    assert.equal(decision.show, true);
    assert.equal(decision.nextState.hasShownThisSession, true);
  });

  it('blocks when the user dismissed during this session', () => {
    const decision = evaluateInterstitialPolicy(
      { ...baseState, hasShownThisSession: true, sessionDismissed: true },
      1_000,
      0,
    );
    assert.equal(decision.show, false);
  });

  it('blocks subsequent searches inside the cooldown window', () => {
    const now = 1_000_000;
    const decision = evaluateInterstitialPolicy(
      {
        ...baseState,
        hasShownThisSession: true,
        dismissedAt: now - INTERSTITIAL_COOLDOWN_MS + 1,
      },
      now,
      0,
    );
    assert.equal(decision.show, false);
  });

  it('shows subsequent searches at the configured probability', () => {
    const decision = evaluateInterstitialPolicy(
      { ...baseState, hasShownThisSession: true },
      1_000_000,
      INTERSTITIAL_SUBSEQUENT_PROBABILITY - 0.01,
    );
    assert.equal(decision.show, true);
  });

  it('skips subsequent searches below the probability threshold', () => {
    const decision = evaluateInterstitialPolicy(
      { ...baseState, hasShownThisSession: true },
      1_000_000,
      INTERSTITIAL_SUBSEQUENT_PROBABILITY + 0.01,
    );
    assert.equal(decision.show, false);
  });
});
