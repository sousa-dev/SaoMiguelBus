import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  OPTIMISTIC_GRACE_MS,
  selectEntitlement,
  selectIsPremium,
  shouldApplyBackendEntitlement,
} from '@/lib/entitlement-store';
import type { Entitlement } from '@/lib/types';

const premiumStore: Entitlement = {
  tier: 'premium',
  source: 'revenuecat',
  status: 'active',
  currentPeriodEnd: null,
  features: [],
  manageVia: 'app_store',
};

const premiumBackend: Entitlement = {
  tier: 'premium',
  source: 'legacy_email',
  status: 'active',
  currentPeriodEnd: null,
  features: [],
  manageVia: 'none',
};

const freeBackend: Entitlement = {
  tier: 'free',
  source: null,
  status: null,
  currentPeriodEnd: null,
  features: [],
  manageVia: 'none',
};

describe('entitlement store', () => {
  it('selectIsPremium is true when store entitlement is premium', () => {
    assert.equal(
      selectIsPremium({ backendEntitlement: null, storeEntitlement: premiumStore }),
      true,
    );
  });

  it('selectIsPremium is true when backend lags but store is premium', () => {
    assert.equal(
      selectIsPremium({ backendEntitlement: freeBackend, storeEntitlement: premiumStore }),
      true,
    );
  });

  it('selectEntitlement prefers backend when both are premium', () => {
    assert.equal(
      selectEntitlement({ backendEntitlement: premiumBackend, storeEntitlement: premiumStore })
        ?.source,
      'legacy_email',
    );
  });

  it('shouldApplyBackendEntitlement ignores free while optimistic grace is open', () => {
    const now = Date.now();
    assert.equal(
      shouldApplyBackendEntitlement(freeBackend, now + OPTIMISTIC_GRACE_MS, now),
      false,
    );
    assert.equal(shouldApplyBackendEntitlement(freeBackend, null, now), true);
    assert.equal(
      shouldApplyBackendEntitlement(premiumBackend, now + OPTIMISTIC_GRACE_MS, now),
      true,
    );
  });
});
