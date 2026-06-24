import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { attemptAppStoreReview } from '@/features/app-review/lib/attempt-app-store-review';

const STORE_URLS = {
  ios: 'https://apps.apple.com/app/id123',
  android: 'https://play.google.com/store/apps/details?id=com.example',
};

describe('attemptAppStoreReview', () => {
  it('opens the store listing directly for manual settings taps', async () => {
    let openedStore = false;
    let requestedNative = false;

    const result = await attemptAppStoreReview(
      {
        trigger: 'settings_manual',
        platform: 'ios',
        storeUrls: STORE_URLS,
      },
      {
        isStoreReviewAvailable: async () => true,
        requestStoreReview: async () => {
          requestedNative = true;
        },
        openStoreUrl: async () => {
          openedStore = true;
          return true;
        },
      },
    );

    assert.equal(result, true);
    assert.equal(openedStore, true);
    assert.equal(requestedNative, false);
  });

  it('falls back to the store listing when native review is unavailable', async () => {
    let openedStore = false;

    const result = await attemptAppStoreReview(
      {
        trigger: 'marketplace_listing_created',
        platform: 'android',
        storeUrls: STORE_URLS,
      },
      {
        isStoreReviewAvailable: async () => false,
        requestStoreReview: async () => {
          throw new Error('should not run');
        },
        openStoreUrl: async () => {
          openedStore = true;
          return true;
        },
      },
    );

    assert.equal(result, true);
    assert.equal(openedStore, true);
  });

  it('falls back to the store listing when native review throws', async () => {
    let openedStore = false;

    const result = await attemptAppStoreReview(
      {
        trigger: 'transit_search_success_3',
        platform: 'ios',
        storeUrls: STORE_URLS,
      },
      {
        isStoreReviewAvailable: async () => true,
        requestStoreReview: async () => {
          throw new Error('quota exceeded');
        },
        openStoreUrl: async () => {
          openedStore = true;
          return true;
        },
      },
    );

    assert.equal(result, true);
    assert.equal(openedStore, true);
  });
});
