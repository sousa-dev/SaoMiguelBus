/** Cross-repo contract: must match billing.services.REVENUECAT_APP_USER_ID_PREFIX. */
export const REVENUECAT_APP_USER_ID_PREFIX = 'smb_user_';

/**
 * RevenueCat entitlement identifier. MUST match the dashboard entitlement and
 * whatever the backend webhook (`reconcile_revenuecat`) treats as premium.
 */
export const PREMIUM_ENTITLEMENT_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID ?? 'Sao Miguel Hub Premium';

export function revenueCatAppUserId(user: { id: number | string }): string {
  return `${REVENUECAT_APP_USER_ID_PREFIX}${user.id}`;
}
