import { shouldForceInternalAds } from '@/features/ads/lib/force-internal-ads';
import { isEntitlementStoreHydrated, useEntitlementStore } from '@/lib/entitlement-store';
import { hasCompletedStoreEntitlementSync } from '@/features/premium/lib/store-entitlement-sync-state';
import type { Entitlement } from '@/lib/types';

export function canShowInternalAdsOfflineFromState(input: {
  isPremium: boolean;
  shouldShowAds: boolean;
  hydrated: boolean;
  backendEntitlement: Entitlement | null;
  storeSyncCompleted: boolean;
  forceInternal?: boolean;
}): boolean {
  if (input.isPremium || !input.shouldShowAds) {
    return false;
  }
  if (input.forceInternal) {
    return true;
  }
  if (!input.hydrated) {
    return false;
  }
  if (input.backendEntitlement != null) {
    return true;
  }
  return input.storeSyncCompleted;
}

/**
 * Whether internal fallback ads may show while offline.
 * Requires a reliable non-premium signal — persisted backend or RC store sync.
 */
export function canShowInternalAdsOffline(isPremium: boolean, shouldShowAds: boolean): boolean {
  return canShowInternalAdsOfflineFromState({
    isPremium,
    shouldShowAds,
    hydrated: isEntitlementStoreHydrated(),
    backendEntitlement: useEntitlementStore.getState().backendEntitlement,
    storeSyncCompleted: hasCompletedStoreEntitlementSync(),
    forceInternal: shouldForceInternalAds(),
  });
}
