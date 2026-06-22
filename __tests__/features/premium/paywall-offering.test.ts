import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  resolveOfferingForVariant,
  resolvePaywallVariant,
} from '@/features/premium/lib/paywall-offering';

type MockOffering = { identifier: string };
type MockOfferings = {
  current: MockOffering | null;
  all: Record<string, MockOffering>;
};

const defaultOffering = { identifier: 'default' };
const touristOffering = { identifier: 'tourist_7day' };

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
});
