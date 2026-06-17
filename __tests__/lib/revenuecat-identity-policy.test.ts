import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { shouldCallRevenueCatLogOut } from '@/lib/revenuecat-identity-policy';

describe('shouldCallRevenueCatLogOut', () => {
  it('skips logOut for anonymous SDK users', () => {
    assert.equal(shouldCallRevenueCatLogOut(true), false);
  });

  it('calls logOut for identified SDK users', () => {
    assert.equal(shouldCallRevenueCatLogOut(false), true);
  });
});
