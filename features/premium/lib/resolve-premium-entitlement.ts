import type { CustomerInfo } from 'react-native-purchases';

import { resolveTouristPassExpiryIso } from '@/features/premium/lib/tourist-pass-expiry';
import { PREMIUM_ENTITLEMENT_ID } from '@/lib/revenuecat-ids';
import type { Entitlement, ManageVia } from '@/lib/types';

function buildSubscriptionEntitlement(
  expirationDate: string | null,
  willRenew: boolean,
  manageVia: ManageVia,
): Entitlement {
  return {
    tier: 'premium',
    source: 'revenuecat',
    status: willRenew ? 'active' : 'cancelled',
    currentPeriodEnd: expirationDate,
    features: [],
    manageVia,
  };
}

function buildTouristPassEntitlement(currentPeriodEnd: string): Entitlement {
  return {
    tier: 'premium',
    source: 'revenuecat',
    status: 'cancelled',
    currentPeriodEnd,
    features: [],
    manageVia: 'none',
  };
}

/**
 * Resolve premium from RevenueCat `CustomerInfo`: auto-renewing subscription first,
 * then stacked tourist day-pass expiry from non-subscription transactions.
 */
export function resolvePremiumEntitlementFromCustomerInfo(
  info: CustomerInfo,
  subscriptionManageVia: ManageVia,
  now = Date.now(),
): Entitlement | null {
  const active = info.entitlements.active[PREMIUM_ENTITLEMENT_ID];
  if (active?.expirationDate) {
    const endMs = new Date(active.expirationDate).getTime();
    if (endMs > now) {
      return buildSubscriptionEntitlement(
        active.expirationDate,
        active.willRenew,
        subscriptionManageVia,
      );
    }
  } else if (active?.willRenew) {
    return buildSubscriptionEntitlement(active.expirationDate ?? null, true, subscriptionManageVia);
  }

  // A grant issued from the RevenueCat dashboard — how a team or admin account,
  // a support make-good or a lifetime award gets premium. It is active, never
  // expires and never renews, which is the SAME shape a SPENT tourist pass
  // leaves behind, and the branch below deliberately reads that shape as "not
  // premium". The store is what tells them apart: only RevenueCat itself issues
  // PROMOTIONAL, so it is checked first.
  //
  // Left unhandled, a granted account is premium as far as RevenueCat is
  // concerned and free as far as the app is concerned — and every premium
  // action becomes a dead tap, because `presentPaywallIfNeeded` correctly
  // declines to show a paywall to someone who already holds the entitlement.
  if (active?.isActive && active.store === 'PROMOTIONAL') {
    return buildSubscriptionEntitlement(active.expirationDate ?? null, active.willRenew, 'none');
  }

  const touristEndIso = resolveTouristPassExpiryIso(info, now);
  if (touristEndIso) {
    return buildTouristPassEntitlement(touristEndIso);
  }

  if (active?.isActive && active.expirationDate == null && !active.willRenew) {
    return null;
  }

  if (active?.isActive && active.expirationDate == null) {
    return buildSubscriptionEntitlement(null, active.willRenew, subscriptionManageVia);
  }

  return null;
}
