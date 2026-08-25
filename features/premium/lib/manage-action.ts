import { Platform } from 'react-native';

import type { EntitlementSource, ManageVia } from '@/lib/types';

export type ManageAction =
  | { kind: 'customer_center' }
  | { kind: 'native_subscriptions' }
  | { kind: 'web_portal' }
  | { kind: 'informational' };

/** Deep links to the platform-native subscription management screens. */
export const NATIVE_SUBSCRIPTIONS_URL =
  Platform.OS === 'ios'
    ? 'https://apps.apple.com/account/subscriptions'
    : 'https://play.google.com/store/account/subscriptions';

/**
 * Decide how a user manages their subscription.
 *
 * Branches on `source` first: legacy-email and manual grants aren't
 * self-managed (informational only). Store-backed subscriptions prefer the
 * Customer Center when enabled, else the native subscriptions screen. Stripe
 * (web billing) routes to the web portal.
 */
export function resolveManageAction(input: {
  source: EntitlementSource | null;
  manageVia: ManageVia;
  customerCenterEnabled: boolean;
}): ManageAction {
  const { source, manageVia, customerCenterEnabled } = input;

  if (source === 'legacy_email' || source === 'manual' || manageVia === 'none') {
    return { kind: 'informational' };
  }
  if (manageVia === 'app_store' || manageVia === 'play_store') {
    return customerCenterEnabled ? { kind: 'customer_center' } : { kind: 'native_subscriptions' };
  }
  if (manageVia === 'stripe') {
    return { kind: 'web_portal' };
  }
  return { kind: 'informational' };
}
