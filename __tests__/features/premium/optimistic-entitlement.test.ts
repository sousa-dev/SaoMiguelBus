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
    store?: string;
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
      store: entitlement.store ?? 'APP_STORE',
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

  /**
   * A dashboard grant — an admin or team account, a support make-good, a
   * lifetime award. It is active with no expiry and never renews, exactly like a
   * SPENT tourist pass, and was being read as the latter and thrown away.
   *
   * The consequence was not merely "shows as free": RevenueCat saw the
   * entitlement, so `presentPaywallIfNeeded` correctly refused to show a paywall,
   * and every premium action became a tap that did nothing at all.
   */
  it('treats a promotional grant as premium, despite no expiry and no renewal', () => {
    const info = mockCustomerInfo({
      entitlement: {
        expirationDate: null,
        willRenew: false,
        isActive: true,
        store: 'PROMOTIONAL',
      },
    });
    const result = resolvePremiumEntitlementFromCustomerInfo(info, 'app_store');
    assert.equal(result?.tier, 'premium');
    assert.equal(result?.currentPeriodEnd, null, 'a grant does not expire');
    assert.equal(result?.manageVia, 'none', 'not managed in any store');
  });

  it('keeps a promotional grant premium even with a long-expired tourist pass', () => {
    const info = mockCustomerInfo({
      entitlement: {
        expirationDate: null,
        willRenew: false,
        isActive: true,
        store: 'PROMOTIONAL',
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
    assert.equal(result?.tier, 'premium');
  });

  it('still expires a spent tourist pass — the grant check must not swallow it', () => {
    const info = mockCustomerInfo({
      entitlement: { expirationDate: null, willRenew: false, isActive: true, store: 'APP_STORE' },
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
});
