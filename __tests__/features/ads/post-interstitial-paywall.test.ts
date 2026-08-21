import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  POST_INTERSTITIAL_PAYWALL_PROBABILITY,
  shouldOpenPaywallAfterInterstitial,
} from '@/features/ads/lib/post-interstitial-paywall';

const base = {
  isPremium: false,
  isAdFreeActive: false,
  showedRealAd: true,
  randomValue: 0,
};

describe('shouldOpenPaywallAfterInterstitial', () => {
  it('is a coin flip', () => {
    assert.equal(POST_INTERSTITIAL_PAYWALL_PROBABILITY, 0.5);
  });

  it('opens on a winning roll after a real ad', () => {
    assert.equal(
      shouldOpenPaywallAfterInterstitial({
        ...base,
        randomValue: POST_INTERSTITIAL_PAYWALL_PROBABILITY - 0.01,
      }),
      true,
    );
  });

  it('stays closed on a losing roll', () => {
    assert.equal(
      shouldOpenPaywallAfterInterstitial({
        ...base,
        randomValue: POST_INTERSTITIAL_PAYWALL_PROBABILITY,
      }),
      false,
    );
    assert.equal(
      shouldOpenPaywallAfterInterstitial({
        ...base,
        randomValue: POST_INTERSTITIAL_PAYWALL_PROBABILITY + 0.01,
      }),
      false,
    );
  });

  it('never opens for premium users', () => {
    assert.equal(
      shouldOpenPaywallAfterInterstitial({ ...base, isPremium: true, randomValue: 0 }),
      false,
    );
  });

  it('never opens during a rewarded ad-free window', () => {
    assert.equal(
      shouldOpenPaywallAfterInterstitial({ ...base, isAdFreeActive: true, randomValue: 0 }),
      false,
    );
  });

  // The upsell modal is itself the waterfall's fallback ad. Rolling a paywall on
  // top of it would recreate the two-modals-in-a-row complaint we are fixing.
  it('never opens when the upsell modal was the ad', () => {
    assert.equal(
      shouldOpenPaywallAfterInterstitial({ ...base, showedRealAd: false, randomValue: 0 }),
      false,
    );
  });

  it('is roughly even across many rolls', () => {
    let opened = 0;
    const rolls = 1000;
    for (let i = 0; i < rolls; i += 1) {
      if (shouldOpenPaywallAfterInterstitial({ ...base, randomValue: i / rolls })) {
        opened += 1;
      }
    }
    assert.equal(opened, rolls * POST_INTERSTITIAL_PAYWALL_PROBABILITY);
  });
});
