import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { REVENUECAT_APP_USER_ID_PREFIX, revenueCatAppUserId } from '@/lib/revenuecat-ids';

describe('revenueCatAppUserId', () => {
  it('uses the smb_user_ prefix expected by the backend webhook', () => {
    assert.equal(REVENUECAT_APP_USER_ID_PREFIX, 'smb_user_');
    assert.equal(revenueCatAppUserId({ id: 42 }), 'smb_user_42');
  });
});
