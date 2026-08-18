import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  resolveOfferingForVariant,
  resolvePaywallVariant,
} from '@/features/premium/lib/paywall-offering';

type MockOffering = { identifier: string; availablePackages: unknown[] };
type MockOfferings = {
  current: MockOffering | null;
  all: Record<string, MockOffering>;
};

/** RevenueCat drops packages whose product the store could not price. */
function offering(identifier: string, packageCount = 1): MockOffering {
  return { identifier, availablePackages: Array.from({ length: packageCount }, () => ({})) };
}

const defaultOffering = offering('default');
const touristOffering = offering('tourist_7day');

function mockOfferings(overrides: Partial<MockOfferings> = {}): MockOfferings {
  return {
    current: defaultOffering,
    all: { default: defaultOffering, tourist_7day: touristOffering },
    ...overrides,
  };
}

describe('resolvePaywallVariant', () => {
  it('maps tourist user type to tourist variant', () => {
    assert.equal(resolvePaywallVariant('tourist'), 'tourist');
  });

  it('maps resident, newcomer, and null to default variant', () => {
    assert.equal(resolvePaywallVariant('resident'), 'default');
    assert.equal(resolvePaywallVariant('newcomer'), 'default');
    assert.equal(resolvePaywallVariant(null), 'default');
  });
});

describe('resolveOfferingForVariant', () => {
  const previousTouristId = process.env.EXPO_PUBLIC_REVENUECAT_TOURIST_OFFERING_ID;

  afterEach(() => {
    if (previousTouristId === undefined) {
      delete process.env.EXPO_PUBLIC_REVENUECAT_TOURIST_OFFERING_ID;
    } else {
      process.env.EXPO_PUBLIC_REVENUECAT_TOURIST_OFFERING_ID = previousTouristId;
    }
  });

  it('returns offerings.current for default variant', () => {
    const offerings = mockOfferings();
    assert.equal(
      resolveOfferingForVariant(offerings as never, 'default'),
      defaultOffering,
    );
  });

  it('returns tourist offering when env id is set and offering exists', () => {
    process.env.EXPO_PUBLIC_REVENUECAT_TOURIST_OFFERING_ID = 'tourist_7day';
    const offerings = mockOfferings();
    assert.equal(
      resolveOfferingForVariant(offerings as never, 'tourist'),
      touristOffering,
    );
  });

  it('returns null for tourist variant when env id is unset', () => {
    delete process.env.EXPO_PUBLIC_REVENUECAT_TOURIST_OFFERING_ID;
    const offerings = mockOfferings();
    assert.equal(resolveOfferingForVariant(offerings as never, 'tourist'), null);
  });

  it('returns null for tourist variant when offering id is missing from all', () => {
    process.env.EXPO_PUBLIC_REVENUECAT_TOURIST_OFFERING_ID = 'missing_offering';
    const offerings = mockOfferings();
    assert.equal(resolveOfferingForVariant(offerings as never, 'tourist'), null);
  });

  /**
   * The Android bug: `7_day_premium` and `15_days_premium` resolve on the App
   * Store and come back PRODUCT_NOT_FOUND on Google Play, so RevenueCat hands
   * back the tourist offering with every package dropped. Presenting that shows
   * nothing, and a premium button becomes a dead tap.
   *
   * Null is the right answer because the callers omit `offering` entirely when
   * it is null, and RevenueCat then presents the current offering.
   */
  it('falls back to the default paywall when the tourist offering has no sellable packages', () => {
    process.env.EXPO_PUBLIC_REVENUECAT_TOURIST_OFFERING_ID = 'tourist_7day';
    const offerings = mockOfferings({
      all: { default: defaultOffering, tourist_7day: offering('tourist_7day', 0) },
    });
    assert.equal(
      resolveOfferingForVariant(offerings as never, 'tourist'),
      null,
      'an unpriceable offering must never be presented',
    );
  });

  it('tolerates an offering the SDK returned without a packages array', () => {
    process.env.EXPO_PUBLIC_REVENUECAT_TOURIST_OFFERING_ID = 'tourist_7day';
    const offerings = mockOfferings({
      all: { default: defaultOffering, tourist_7day: { identifier: 'tourist_7day' } as never },
    });
    assert.equal(resolveOfferingForVariant(offerings as never, 'tourist'), null);
  });
});
