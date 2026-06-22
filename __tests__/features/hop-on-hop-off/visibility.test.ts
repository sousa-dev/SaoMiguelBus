import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HOP_ON_OFF_DEFAULT_URL, resolveHopOnOffUrl } from '@/config/hop-on-hop-off';
import { isHopOnHopOffVisible } from '@/features/hop-on-hop-off/lib/visibility';

describe('isHopOnHopOffVisible', () => {
  it('is true for tourist user type', () => {
    assert.equal(isHopOnHopOffVisible('tourist'), true);
  });

  it('is true when personalization was skipped (null user type)', () => {
    assert.equal(isHopOnHopOffVisible(null), true);
  });

  it('is false for resident user type', () => {
    assert.equal(isHopOnHopOffVisible('resident'), false);
  });

  it('is false for newcomer user type', () => {
    assert.equal(isHopOnHopOffVisible('newcomer'), false);
  });
});

describe('resolveHopOnOffUrl', () => {
  it('returns the default affiliate URL when env override is unset', () => {
    const previous = process.env.EXPO_PUBLIC_HOP_ON_OFF_URL;
    delete process.env.EXPO_PUBLIC_HOP_ON_OFF_URL;
    try {
      assert.equal(resolveHopOnOffUrl(), HOP_ON_OFF_DEFAULT_URL);
    } finally {
      if (previous === undefined) {
        delete process.env.EXPO_PUBLIC_HOP_ON_OFF_URL;
      } else {
        process.env.EXPO_PUBLIC_HOP_ON_OFF_URL = previous;
      }
    }
  });

  it('returns env override when set', () => {
    const previous = process.env.EXPO_PUBLIC_HOP_ON_OFF_URL;
    process.env.EXPO_PUBLIC_HOP_ON_OFF_URL = 'https://example.com/hop-on-off';
    try {
      assert.equal(resolveHopOnOffUrl(), 'https://example.com/hop-on-off');
    } finally {
      if (previous === undefined) {
        delete process.env.EXPO_PUBLIC_HOP_ON_OFF_URL;
      } else {
        process.env.EXPO_PUBLIC_HOP_ON_OFF_URL = previous;
      }
    }
  });
});
