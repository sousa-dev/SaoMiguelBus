import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AD_FREE_WINDOW_MS } from '@/features/ads/lib/ad-free-policy';
import { adFreeRemainingMs, shouldShowAds } from '@/features/ads/lib/ad-visibility';

describe('ad-visibility', () => {
  const now = 1_000_000;

  it('shouldShowAds is false for premium regardless of ad-free storage', () => {
    assert.equal(shouldShowAds(true, now + AD_FREE_WINDOW_MS, now), false);
    assert.equal(shouldShowAds(true, null, now), false);
  });

  it('shouldShowAds is false during active ad-free window for non-premium', () => {
    assert.equal(shouldShowAds(false, now + AD_FREE_WINDOW_MS, now), false);
  });

  it('shouldShowAds is true when ad-free expired for non-premium', () => {
    assert.equal(shouldShowAds(false, now - 1, now), true);
    assert.equal(shouldShowAds(false, null, now), true);
  });

  it('adFreeRemainingMs returns positive while active', () => {
    const until = now + 12 * 60 * 1000;
    assert.equal(adFreeRemainingMs(until, now), 12 * 60 * 1000);
    assert.equal(adFreeRemainingMs(until - AD_FREE_WINDOW_MS, now), 0);
  });
});
