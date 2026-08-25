import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { canShowInternalAdsOfflineFromState } from '@/features/ads/lib/ad-offline-gate';

describe('canShowInternalAdsOfflineFromState', () => {
  it('returns false when entitlement store is not hydrated', () => {
    assert.equal(
      canShowInternalAdsOfflineFromState({
        isPremium: false,
        shouldShowAds: true,
        hydrated: false,
        backendEntitlement: null,
        storeSyncCompleted: true,
      }),
      false,
    );
  });

  it('returns true when backend entitlement exists for a free user', () => {
    assert.equal(
      canShowInternalAdsOfflineFromState({
        isPremium: false,
        shouldShowAds: true,
        hydrated: true,
        backendEntitlement: {
          tier: 'free',
          source: 'legacy_email',
          manageVia: 'web',
        },
        storeSyncCompleted: false,
      }),
      true,
    );
  });

  it('returns false for premium users', () => {
    assert.equal(
      canShowInternalAdsOfflineFromState({
        isPremium: true,
        shouldShowAds: false,
        hydrated: true,
        backendEntitlement: null,
        storeSyncCompleted: true,
      }),
      false,
    );
  });

  it('returns true after store entitlement sync completes', () => {
    assert.equal(
      canShowInternalAdsOfflineFromState({
        isPremium: false,
        shouldShowAds: true,
        hydrated: true,
        backendEntitlement: null,
        storeSyncCompleted: true,
      }),
      true,
    );
  });

  it('returns false during ad-free reward window', () => {
    assert.equal(
      canShowInternalAdsOfflineFromState({
        isPremium: false,
        shouldShowAds: false,
        hydrated: true,
        backendEntitlement: null,
        storeSyncCompleted: true,
      }),
      false,
    );
  });

  it('returns true when DEV force-internal is enabled', () => {
    assert.equal(
      canShowInternalAdsOfflineFromState({
        isPremium: false,
        shouldShowAds: true,
        hydrated: false,
        backendEntitlement: null,
        storeSyncCompleted: false,
        forceInternal: true,
      }),
      true,
    );
  });
});
