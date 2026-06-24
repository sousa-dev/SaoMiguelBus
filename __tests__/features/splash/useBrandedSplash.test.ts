import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { shouldHideNativeSplash } from '@/features/splash/branded-splash-theme';

describe('shouldHideNativeSplash', () => {
  it('returns true when native splash has not been hidden yet', () => {
    assert.equal(shouldHideNativeSplash(false), true);
  });

  it('returns false when native splash was already hidden', () => {
    assert.equal(shouldHideNativeSplash(true), false);
  });
});
