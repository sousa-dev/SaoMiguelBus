import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CustomerInfo } from 'react-native-purchases';

import { resolvePremiumEntitlementFromCustomerInfo } from '@/features/premium/lib/resolve-premium-entitlement';
import { PREMIUM_ENTITLEMENT_ID } from '@/lib/revenuecat-ids';

function mockCustomerInfo(partial: {
  entitlement?: {
    expirationDate?: string | null;
    willRenew?: boolean;
    isActive?: boolean;
  } | null;
  nonSubscriptionTransactions?: {
    productIdentifier: string;
    purchaseDate: string;
    transactionIdentifier: string;
    purchaseToken: null;
  }[];
}): CustomerInfo {
  const entitlement = partial.entitlement;
  const active: CustomerInfo['entitlements']['active'] = {};
  if (entitlement) {
    active[PREMIUM_ENTITLEMENT_ID] = {
      identifier: PREMIUM_ENTITLEMENT_ID,
      isActive: entitlement.isActive ?? true,
      willRenew: entitlement.willRenew ?? false,
      expirationDate: entitlement.expirationDate ?? null,
      productIdentifier: 'test_product',
      productPlanIdentifier: null,
      latestPurchaseDate: '2026-01-01T00:00:00.000Z',
      originalPurchaseDate: '2026-01-01T00:00:00.000Z',
      periodType: 'NORMAL',
      store: 'APP_STORE',
      isSandbox: true,
      unsubscribeDetectedAt: null,
      billingIssueDetectedAt: null,
      ownershipType: 'PURCHASED',
      verification: 'NOT_REQUESTED',
    };
  }

  return {
    entitlements: { active, all: active, verification: 'NOT_REQUESTED' },
    nonSubscriptionTransactions: partial.nonSubscriptionTransactions ?? [],
  } as unknown as CustomerInfo;
}

describe('resolvePremiumEntitlementFromCustomerInfo', () => {
  it('returns subscription entitlement with future expirationDate', () => {
    const info = mockCustomerInfo({
      entitlement: {
        expirationDate: '2026-12-31T00:00:00.000Z',
        willRenew: true,
      },
    });
    const result = resolvePremiumEntitlementFromCustomerInfo(
      info,
      'app_store',
      new Date('2026-06-01T00:00:00.000Z').getTime(),
    );
    assert.equal(result?.tier, 'premium');
    assert.equal(result?.status, 'active');
    assert.equal(result?.currentPeriodEnd, '2026-12-31T00:00:00.000Z');
    assert.equal(result?.manageVia, 'app_store');
  });

  it('returns tourist pass when RC entitlement has null expiry but pass tx active', () => {
    const info = mockCustomerInfo({
      entitlement: {
        expirationDate: null,
        willRenew: false,
        isActive: true,
      },
      nonSubscriptionTransactions: [
        {
          productIdentifier: '7_day_premium',
          purchaseDate: '2026-06-01T12:00:00.000Z',
          transactionIdentifier: 'tx1',
          purchaseToken: null,
        },
      ],
    });
    const result = resolvePremiumEntitlementFromCustomerInfo(
      info,
      'app_store',
      new Date('2026-06-02T12:00:00.000Z').getTime(),
    );
    assert.equal(result?.tier, 'premium');
    assert.equal(result?.status, 'cancelled');
    assert.equal(result?.manageVia, 'none');
    assert.equal(result?.currentPeriodEnd, '2026-06-08T12:00:00.000Z');
  });

  it('returns null when tourist pass expired', () => {
    const info = mockCustomerInfo({
      entitlement: {
        expirationDate: null,
        willRenew: false,
        isActive: true,
      },
      nonSubscriptionTransactions: [
        {
          productIdentifier: '7_day_premium',
          purchaseDate: '2026-01-01T12:00:00.000Z',
          transactionIdentifier: 'tx1',
          purchaseToken: null,
        },
      ],
    });
    const result = resolvePremiumEntitlementFromCustomerInfo(
      info,
      'app_store',
      new Date('2026-02-01T12:00:00.000Z').getTime(),
    );
    assert.equal(result, null);
  });

  it('returns null when no entitlement and no tourist txs', () => {
    const info = mockCustomerInfo({});
    assert.equal(resolvePremiumEntitlementFromCustomerInfo(info, 'app_store'), null);
  });
});
