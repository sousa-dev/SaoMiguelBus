import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import type { CustomerInfo } from 'react-native-purchases';

import { logger } from '@/lib/logger';
import type { AuthUser } from '@/lib/types';

/**
 * RevenueCat entitlement identifier. MUST match the dashboard entitlement and
 * whatever the backend webhook (`reconcile_revenuecat`) treats as premium.
 */
export const PREMIUM_ENTITLEMENT_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID ?? 'Sao Miguel Hub Premium';

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
const TEST_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;

/** Customer Center requires a paid RC plan + dashboard config; gated by env. */
export const CUSTOMER_CENTER_ENABLED =
  process.env.EXPO_PUBLIC_REVENUECAT_CUSTOMER_CENTER === 'true';

let configured = false;

/** Pick the SDK key. Test Store key is used only in dev; prod requires a platform key. */
function resolveApiKey(): string | null {
  const platformKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;
  if (platformKey) {
    return platformKey;
  }
  if (__DEV__ && TEST_KEY) {
    return TEST_KEY;
  }
  return null;
}

export function isRevenueCatConfigured(): boolean {
  return configured;
}

/** Why purchases/paywall are disabled — for logs and dev diagnostics. */
export function revenueCatSetupIssue(): 'ok' | 'web' | 'missing_key' | 'configure_failed' {
  if (Platform.OS === 'web') {
    return 'web';
  }
  if (configured) {
    return 'ok';
  }
  if (!resolveApiKey()) {
    return 'missing_key';
  }
  return 'configure_failed';
}

export function revenueCatSetupHint(issue: ReturnType<typeof revenueCatSetupIssue>): string {
  switch (issue) {
    case 'ok':
      return '';
    case 'web':
      return 'IAP is not supported on web.';
    case 'missing_key':
      return 'Add EXPO_PUBLIC_REVENUECAT_IOS_API_KEY (appl_…) or EXPO_PUBLIC_REVENUECAT_TEST_API_KEY (test_…) to .env, then restart Metro with --clear.';
    case 'configure_failed':
      return 'Purchases.configure() failed — use a dev build (npm run ios), not Expo Go.';
  }
}

/**
 * Stable App User ID bound to the backend account. This is the cross-repo
 * coordination point: the API webhook maps this id back to a `billing.Entitlement`.
 * Keep it identical to what the backend's `reconcile_revenuecat` expects.
 */
export function revenueCatAppUserId(user: Pick<AuthUser, 'id'>): string {
  return `smb_user_${user.id}`;
}

/**
 * Configure the SDK once at app boot, before any offerings/purchase call.
 * Safe to call when keys are missing (e.g. Expo Go / web) — it simply no-ops so
 * the rest of the app keeps working and purchase entry points stay disabled.
 */
export function configureRevenueCat(): void {
  if (configured) {
    return;
  }
  if (Platform.OS === 'web') {
    return;
  }
  const apiKey = resolveApiKey();
  if (!apiKey) {
    logger.debug('RevenueCat:', revenueCatSetupHint('missing_key'));
    return;
  }
  try {
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }
    Purchases.configure({ apiKey });
    configured = true;
    logger.debug('RevenueCat: configured');
  } catch (error) {
    logger.error('RevenueCat: configure failed', error);
  }
}

/**
 * Bind/unbind the RevenueCat identity to the signed-in backend user.
 *
 * `logIn`/`logOut` can fail natively; we wrap defensively so a binding failure
 * never crashes the app — but a failed bind means purchases would be attributed
 * to an anonymous id, so callers must verify `getAppUserID()` before purchasing.
 */
export async function bindRevenueCatIdentity(user: AuthUser | null): Promise<void> {
  if (!configured) {
    return;
  }
  try {
    if (user) {
      await Purchases.logIn(revenueCatAppUserId(user));
      logger.debug('RevenueCat: logged in', revenueCatAppUserId(user));
    } else {
      await Purchases.logOut();
      logger.debug('RevenueCat: logged out');
    }
  } catch (error) {
    logger.error('RevenueCat: identity bind failed', error);
  }
}

/** True when the SDK identity matches the expected backend user — gates purchases. */
export async function isIdentityBound(user: Pick<AuthUser, 'id'>): Promise<boolean> {
  if (!configured) {
    return false;
  }
  try {
    const current = await Purchases.getAppUserID();
    return current === revenueCatAppUserId(user);
  } catch (error) {
    logger.error('RevenueCat: getAppUserID failed', error);
    return false;
  }
}

/** Whether the customer holds the premium entitlement right now. */
export function hasPremiumEntitlement(info: CustomerInfo): boolean {
  return Boolean(info.entitlements.active[PREMIUM_ENTITLEMENT_ID]);
}

/** Register a listener for entitlement changes pushed by the SDK (renewals, expiries). */
export function onCustomerInfoUpdate(cb: (info: CustomerInfo) => void): () => void {
  if (!configured) {
    return () => {};
  }
  Purchases.addCustomerInfoUpdateListener(cb);
  return () => Purchases.removeCustomerInfoUpdateListener(cb);
}

/**
 * Map app i18n codes to RevenueCat paywall locale tags.
 * App catalogs use base codes (`pt`); RC dashboard uses `pt_PT` for Portugal.
 */
export function toRevenueCatLocale(i18nCode: string): string {
  const base = i18nCode.split(/[-_]/)[0]?.toLowerCase() ?? i18nCode;
  if (base === 'pt') {
    return 'pt_PT';
  }
  return base;
}

/**
 * Sync RevenueCat UI locale with the in-app language setting.
 * Without this, hosted paywalls follow the device system locale, not i18n.
 */
export async function syncRevenueCatLocale(i18nCode: string): Promise<void> {
  if (!configured) {
    return;
  }
  try {
    const locale = toRevenueCatLocale(i18nCode);
    await Purchases.overridePreferredLocale(locale);
    logger.debug('RevenueCat: locale synced', locale);
  } catch (error) {
    logger.error('RevenueCat: locale sync failed', error);
  }
}
