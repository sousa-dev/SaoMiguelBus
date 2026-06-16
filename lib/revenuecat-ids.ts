/** Cross-repo contract: must match billing.services.REVENUECAT_APP_USER_ID_PREFIX. */
export const REVENUECAT_APP_USER_ID_PREFIX = 'smb_user_';

export function revenueCatAppUserId(user: { id: number | string }): string {
  return `${REVENUECAT_APP_USER_ID_PREFIX}${user.id}`;
}
