import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  PERSONALIZE_USER_TYPE_STEP,
  canAdvancePersonalizeStep,
} from '@/lib/personalize-steps';

describe('canAdvancePersonalizeStep', () => {
  it('allows language step without user type', () => {
    assert.equal(canAdvancePersonalizeStep(0, null), true);
    assert.equal(canAdvancePersonalizeStep(0, 'tourist'), true);
  });

  it('requires user type on user-type step', () => {
    assert.equal(canAdvancePersonalizeStep(PERSONALIZE_USER_TYPE_STEP, null), false);
    assert.equal(canAdvancePersonalizeStep(PERSONALIZE_USER_TYPE_STEP, 'tourist'), true);
    assert.equal(canAdvancePersonalizeStep(PERSONALIZE_USER_TYPE_STEP, 'resident'), true);
    assert.equal(canAdvancePersonalizeStep(PERSONALIZE_USER_TYPE_STEP, 'newcomer'), true);
  });

  it('allows interests and municipality without user type', () => {
    assert.equal(canAdvancePersonalizeStep(2, null), true);
    assert.equal(canAdvancePersonalizeStep(3, null), true);
  });

  it('rejects unknown steps', () => {
    assert.equal(canAdvancePersonalizeStep(4, 'tourist'), false);
    assert.equal(canAdvancePersonalizeStep(-1, 'tourist'), false);
  });
});
