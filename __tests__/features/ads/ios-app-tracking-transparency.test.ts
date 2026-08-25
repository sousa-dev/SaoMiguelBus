import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { shouldRequestIosAppTrackingPermission } from '@/features/ads/lib/ios-app-tracking-policy';

describe('shouldRequestIosAppTrackingPermission', () => {
  it('requests ATT outside the EEA', () => {
    assert.equal(shouldRequestIosAppTrackingPermission(false, ''), true);
  });

  it('requests ATT in the EEA when purpose 1 is granted', () => {
    assert.equal(shouldRequestIosAppTrackingPermission(true, '111'), true);
  });

  it('skips ATT in the EEA when purpose 1 is denied', () => {
    assert.equal(shouldRequestIosAppTrackingPermission(true, '011'), false);
  });
});
