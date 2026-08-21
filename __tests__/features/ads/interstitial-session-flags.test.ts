import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';

import {
  getSessionFlags,
  resetSessionFlags,
  updateSessionFlags,
} from '@/features/ads/lib/interstitial-session-flags';
import { evaluateInterstitialPolicy } from '@/features/ads/lib/interstitial-policy';

describe('interstitial session flags are tracked per intent', () => {
  beforeEach(() => {
    resetSessionFlags();
  });

  it('starts every intent unshown', () => {
    assert.deepEqual(getSessionFlags('search'), {
      hasShownThisSession: false,
      sessionDismissed: false,
    });
    assert.deepEqual(getSessionFlags('live_entry'), {
      hasShownThisSession: false,
      sessionDismissed: false,
    });
  });

  it('does not let a route search consume the MiniBus first show', () => {
    updateSessionFlags('search', { hasShownThisSession: true, sessionDismissed: true });

    assert.equal(getSessionFlags('search').hasShownThisSession, true);
    assert.equal(getSessionFlags('live_entry').hasShownThisSession, false);
  });

  it('does not let MiniBus consume the route search first show', () => {
    updateSessionFlags('live_entry', { hasShownThisSession: true, sessionDismissed: true });

    assert.equal(getSessionFlags('search').hasShownThisSession, false);
  });

  it('ignores undefined patch fields', () => {
    updateSessionFlags('search', { hasShownThisSession: true });
    updateSessionFlags('search', { sessionDismissed: undefined });

    assert.equal(getSessionFlags('search').hasShownThisSession, true);
    assert.equal(getSessionFlags('search').sessionDismissed, false);
  });

  it('returns a copy so callers cannot mutate stored flags', () => {
    const flags = getSessionFlags('search');
    flags.hasShownThisSession = true;

    assert.equal(getSessionFlags('search').hasShownThisSession, false);
  });
});

// The behaviour the MiniBus live entry should now match: guaranteed on the
// first open of a session, probabilistic afterwards.
describe('MiniBus live entry follows the first-then-probability rule', () => {
  beforeEach(() => {
    resetSessionFlags();
  });

  it('shows on the first live entry, then falls back to the probability roll', () => {
    const first = evaluateInterstitialPolicy(
      { ...getSessionFlags('live_entry'), dismissedAt: null },
      1_000,
      0.99,
    );
    assert.equal(first.show, true);

    updateSessionFlags('live_entry', first.nextState);

    const second = evaluateInterstitialPolicy(
      { ...getSessionFlags('live_entry'), dismissedAt: null },
      2_000_000,
      0.99,
    );
    assert.equal(second.show, false, 'a losing roll must not show a second ad');
  });
});
