import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isTouristPassEntitlement } from '@/features/premium/lib/is-tourist-pass-entitlement';
import { getPremiumDaysRemaining } from '@/features/premium/lib/premium-time-remaining';
import type { Entitlement } from '@/lib/types';

const subscriptionEntitlement: Entitlement = {
  tier: 'premium',
  source: 'revenuecat',
  status: 'active',
  currentPeriodEnd: '2026-12-31T00:00:00.000Z',
  features: [],
  manageVia: 'app_store',
};

const touristPassEntitlement: Entitlement = {
  tier: 'premium',
  source: 'revenuecat',
  status: 'cancelled',
  currentPeriodEnd: '2026-06-10T00:00:00.000Z',
  features: [],
  manageVia: 'none',
};

describe('getPremiumDaysRemaining', () => {
  it('ceil partial days to at least 1 while still active', () => {
    const now = new Date('2026-06-09T20:00:00.000Z').getTime();
    assert.equal(getPremiumDaysRemaining('2026-06-10T00:00:00.000Z', now), 1);
  });

  it('returns ceil whole days', () => {
    const now = new Date('2026-06-01T00:00:00.000Z').getTime();
    assert.equal(getPremiumDaysRemaining('2026-06-06T12:00:00.000Z', now), 6);
  });

  it('returns 0 when end is in the past', () => {
    const now = new Date('2026-07-01T00:00:00.000Z').getTime();
    assert.equal(getPremiumDaysRemaining('2026-06-10T00:00:00.000Z', now), 0);
  });
});

describe('isTouristPassEntitlement', () => {
  it('detects tourist pass entitlements', () => {
    assert.equal(isTouristPassEntitlement(touristPassEntitlement), true);
  });

  it('returns false for subscription entitlements', () => {
    assert.equal(isTouristPassEntitlement(subscriptionEntitlement), false);
  });
});
