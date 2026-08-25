import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PurchasesStoreTransaction } from 'react-native-purchases';

import {
  computeStackedTouristPassEndMs,
  parseTouristPassProductDurations,
  resolveTouristPassExpiryIso,
} from '@/features/premium/lib/tourist-pass-expiry';

const DURATION_MAP = { '7_day_premium': 7, '15_days_premium': 15 };

function tx(productIdentifier: string, purchaseDate: string): PurchasesStoreTransaction {
  return {
    productIdentifier,
    purchaseDate,
    transactionIdentifier: `${productIdentifier}-${purchaseDate}`,
    purchaseToken: null,
  };
}

function mockCustomerInfo(transactions: PurchasesStoreTransaction[]) {
  return { nonSubscriptionTransactions: transactions } as Parameters<
    typeof resolveTouristPassExpiryIso
  >[0];
}

describe('parseTouristPassProductDurations', () => {
  it('parses product:days pairs', () => {
    assert.deepEqual(parseTouristPassProductDurations('7_day_premium:7,15_days_premium:15'), {
      '7_day_premium': 7,
      '15_days_premium': 15,
    });
  });

  it('ignores invalid segments', () => {
    assert.deepEqual(parseTouristPassProductDurations('bad,7_day_premium:7,:3'), {
      '7_day_premium': 7,
    });
  });
});

describe('computeStackedTouristPassEndMs', () => {
  const t0 = '2026-01-01T12:00:00.000Z';

  it('returns null for empty transactions', () => {
    assert.equal(computeStackedTouristPassEndMs([], DURATION_MAP), null);
  });

  it('single 7-day purchase ends purchase + 7d', () => {
    const end = computeStackedTouristPassEndMs([tx('7_day_premium', t0)], DURATION_MAP);
    assert.equal(end, new Date('2026-01-08T12:00:00.000Z').getTime());
  });

  it('two 7-day purchases same timestamp stack to 14d', () => {
    const end = computeStackedTouristPassEndMs(
      [tx('7_day_premium', t0), tx('7_day_premium', t0)],
      DURATION_MAP,
    );
    assert.equal(end, new Date('2026-01-15T12:00:00.000Z').getTime());
  });

  it('second purchase while first active stacks from first end', () => {
    const day3 = '2026-01-04T12:00:00.000Z';
    const end = computeStackedTouristPassEndMs(
      [tx('7_day_premium', t0), tx('7_day_premium', day3)],
      DURATION_MAP,
    );
    assert.equal(end, new Date('2026-01-15T12:00:00.000Z').getTime());
  });

  it('repurchase after expiry starts fresh window', () => {
    const afterExpiry = '2026-01-10T12:00:00.000Z';
    const end = computeStackedTouristPassEndMs(
      [tx('7_day_premium', t0), tx('7_day_premium', afterExpiry)],
      DURATION_MAP,
    );
    assert.equal(end, new Date('2026-01-17T12:00:00.000Z').getTime());
  });

  it('7-day then 15-day stacks cumulative duration', () => {
    const day0 = '2026-01-01T12:00:00.000Z';
    const end = computeStackedTouristPassEndMs(
      [tx('7_day_premium', day0), tx('15_days_premium', day0)],
      DURATION_MAP,
    );
    assert.equal(end, new Date('2026-01-23T12:00:00.000Z').getTime());
  });

  it('ignores unknown product IDs', () => {
    const end = computeStackedTouristPassEndMs([tx('monthly_sub', t0)], DURATION_MAP);
    assert.equal(end, null);
  });
});

describe('resolveTouristPassExpiryIso', () => {
  it('returns ISO string when pass is active', () => {
    const now = new Date('2026-01-02T12:00:00.000Z').getTime();
    const iso = resolveTouristPassExpiryIso(
      mockCustomerInfo([tx('7_day_premium', '2026-01-01T12:00:00.000Z')]),
      now,
    );
    assert.equal(iso, '2026-01-08T12:00:00.000Z');
  });

  it('returns null when pass expired', () => {
    const now = new Date('2026-02-01T12:00:00.000Z').getTime();
    assert.equal(
      resolveTouristPassExpiryIso(
        mockCustomerInfo([tx('7_day_premium', '2026-01-01T12:00:00.000Z')]),
        now,
      ),
      null,
    );
  });
});
