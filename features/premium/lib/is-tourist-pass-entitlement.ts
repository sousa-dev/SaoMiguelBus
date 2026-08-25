import type { Entitlement } from '@/lib/types';

/** Tourist day-pass premium (client-computed expiry, not a subscription). */
export function isTouristPassEntitlement(entitlement: Entitlement | null | undefined): boolean {
  return (
    entitlement?.tier === 'premium' &&
    entitlement.source === 'revenuecat' &&
    entitlement.status === 'cancelled' &&
    entitlement.manageVia === 'none' &&
    entitlement.currentPeriodEnd != null
  );
}
