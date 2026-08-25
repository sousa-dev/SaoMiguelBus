import { Platform } from 'react-native';
import type { CustomerInfo } from 'react-native-purchases';

import { resolvePremiumEntitlementFromCustomerInfo } from '@/features/premium/lib/resolve-premium-entitlement';
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
  return resolvePremiumEntitlementFromCustomerInfo(info, manageViaForPlatform());
}

export { resolvePremiumEntitlementFromCustomerInfo } from '@/features/premium/lib/resolve-premium-entitlement';
