import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isAdPrivacyOptionsRequired } from '@/features/ads/lib/ad-privacy-options';

describe('isAdPrivacyOptionsRequired', () => {
  it('is true only when UMP status is REQUIRED', () => {
    assert.equal(isAdPrivacyOptionsRequired('REQUIRED'), true);
  });

  it('is false for UNKNOWN', () => {
    assert.equal(isAdPrivacyOptionsRequired('UNKNOWN'), false);
  });

  it('is false for NOT_REQUIRED', () => {
    assert.equal(isAdPrivacyOptionsRequired('NOT_REQUIRED'), false);
  });
});
