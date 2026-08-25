import type { PurchasesOffering, PurchasesOfferings } from 'react-native-purchases';

import type { UserType } from '@/lib/types';

export type PaywallVariant = 'default' | 'tourist';

function readTouristOfferingId(): string {
  return (process.env.EXPO_PUBLIC_REVENUECAT_TOURIST_OFFERING_ID ?? '').trim();
}

export function resolvePaywallVariant(userType: UserType | null): PaywallVariant {
  return userType === 'tourist' ? 'tourist' : 'default';
}

/**
 * An offering the store could not price is not a paywall.
 *
 * RevenueCat drops any package whose product the store failed to fetch, so an
 * offering can come back present-but-empty. Handing that to `presentPaywall`
 * renders nothing at all, which is how a premium button becomes a dead tap.
 */
function hasPurchasablePackages(offering: PurchasesOffering | null): boolean {
  return (offering?.availablePackages?.length ?? 0) > 0;
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

  const tourist = offerings.all[touristId] ?? null;
  // Returning null is not "no paywall" — the callers omit the `offering` field
  // entirely, and RevenueCat then presents the current offering. So a tourist
  // whose passes the store cannot sell still sees the standard paywall: worse
  // targeted, but visible and purchasable.
  //
  // This is not hypothetical. The tourist passes (`7_day_premium`,
  // `15_days_premium`) resolve on the App Store and come back PRODUCT_NOT_FOUND
  // on Google Play, so every tourist-persona Android user was tapping premium
  // actions that did nothing whatsoever.
  return hasPurchasablePackages(tourist) ? tourist : null;
}
