import { Platform } from 'react-native';
import type { CustomerInfo } from 'react-native-purchases';

import { PREMIUM_ENTITLEMENT_ID } from '@/lib/revenuecat';
import type { Entitlement, ManageVia } from '@/lib/types';

function manageViaForPlatform(): ManageVia {
  if (Platform.OS === 'ios') {
    return 'app_store';
  }
  if (Platform.OS === 'android') {
    return 'play_store';
  }
  return 'none';
}

/**
 * Build an optimistic premium `Entitlement` from a RevenueCat `CustomerInfo`,
 * used to unlock the UI immediately after a verified purchase while the backend
 * webhook catches up. Returns `null` when the premium entitlement is not active,
 * so callers never optimistically *downgrade* — only the backend does that.
 */
export function optimisticEntitlementFromCustomerInfo(info: CustomerInfo): Entitlement | null {
  const active = info.entitlements.active[PREMIUM_ENTITLEMENT_ID];
  if (!active) {
    return null;
  }
  return {
    tier: 'premium',
    source: 'revenuecat',
    status: active.willRenew ? 'active' : 'cancelled',
    currentPeriodEnd: active.expirationDate ?? null,
    features: [],
    manageVia: manageViaForPlatform(),
  };
}
