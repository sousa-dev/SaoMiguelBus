import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AD_FREE_WINDOW_MS } from '@/features/ads/lib/ad-free-policy';
import { computeAdFreeUntil, isAdFreeActive } from '@/features/ads/lib/ad-free-storage';

describe('ad-free-storage (pure)', () => {
  it('isAdFreeActive is true when until is in the future', () => {
    assert.equal(isAdFreeActive(1_000_000, 500_000), true);
    assert.equal(isAdFreeActive(1_000_000, 1_000_000), false);
    assert.equal(isAdFreeActive(null, 500_000), false);
  });

  it('computeAdFreeUntil extends from current window when re-granting', () => {
    const now = 12 * 60 * 60 * 1000;
    const existingUntil = now + 5 * 60 * 1000;
    const next = computeAdFreeUntil(now, AD_FREE_WINDOW_MS, existingUntil);
    assert.equal(next, existingUntil + AD_FREE_WINDOW_MS);
  });

  it('computeAdFreeUntil sets until = now + duration when no prior window', () => {
    const now = 1_000_000;
    assert.equal(computeAdFreeUntil(now, AD_FREE_WINDOW_MS, null), now + AD_FREE_WINDOW_MS);
  });
});
