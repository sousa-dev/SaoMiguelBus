import type { PurchasesOffering, PurchasesOfferings } from 'react-native-purchases';

import type { UserType } from '@/lib/types';

export type PaywallVariant = 'default' | 'tourist';

function readTouristOfferingId(): string {
  return (process.env.EXPO_PUBLIC_REVENUECAT_TOURIST_OFFERING_ID ?? '').trim();
}

export function resolvePaywallVariant(userType: UserType | null): PaywallVariant {
  return userType === 'tourist' ? 'tourist' : 'default';
}

export function resolveOfferingForVariant(
  offerings: PurchasesOfferings,
  variant: PaywallVariant,
): PurchasesOffering | null {
  if (variant === 'default') {
    return offerings.current ?? null;
  }

  const touristId = readTouristOfferingId();
  if (!touristId) {
    return null;
  }

  return offerings.all[touristId] ?? null;
}
