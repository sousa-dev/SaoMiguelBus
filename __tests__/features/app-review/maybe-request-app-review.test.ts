import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  maybeRequestAppReview,
  type AppReviewRuntime,
} from '@/features/app-review/lib/maybe-request-app-review-core';
import type { AppReviewStorageState } from '@/lib/app-review-storage';

const STORE_URLS = {
  ios: 'https://apps.apple.com/app/id123',
  android: 'https://play.google.com/store/apps/details?id=com.example',
};

function emptyStorage(): AppReviewStorageState {
  return {
    lastAttemptAt: null,
    attemptCount: 0,
    seenTriggers: [],
    transitSuccessfulSearchCount: 0,
  };
}

type TestRuntime = AppReviewRuntime & {
  calls: {
    requestStoreReview: number;
    openStoreUrl: number;
    trackAttempt: number;
    recordAttempt: number;
    openNegativeFeedback: number;
    recordDeclined: number;
    trackSatisfactionDeclined: number;
  };
  getStorage: () => AppReviewStorageState;
};

function createRuntime(overrides: Partial<AppReviewRuntime> = {}): TestRuntime {
  let storage = emptyStorage();
  const calls = {
    requestStoreReview: 0,
    openStoreUrl: 0,
    trackAttempt: 0,
    recordAttempt: 0,
    openNegativeFeedback: 0,
    recordDeclined: 0,
    trackSatisfactionDeclined: 0,
  };

  const runtime: TestRuntime = {
    loadStorage: async () => storage,
    recordAttempt: async (trigger, attemptedAt, previous) => {
      calls.recordAttempt += 1;
      storage = {
        ...previous,
        lastAttemptAt: attemptedAt,
        attemptCount: previous.attemptCount + 1,
        seenTriggers: previous.seenTriggers.includes(trigger)
          ? previous.seenTriggers
          : [...previous.seenTriggers, trigger],
      };
      return storage;
    },
    recordDeclined: async (trigger, previous) => {
      calls.recordDeclined += 1;
      storage = {
        ...previous,
        seenTriggers: previous.seenTriggers.includes(trigger)
          ? previous.seenTriggers
          : [...previous.seenTriggers, trigger],
      };
      return storage;
    },
    isStoreReviewAvailable: async () => true,
    requestStoreReview: async () => {
      calls.requestStoreReview += 1;
    },
    openStoreUrl: async () => {
      calls.openStoreUrl += 1;
      return true;
    },
    askSatisfaction: async () => 'enjoying',
    openNegativeFeedback: async () => {
      calls.openNegativeFeedback += 1;
    },
    trackAttempt: () => {
      calls.trackAttempt += 1;
    },
    trackSatisfactionDeclined: () => {
      calls.trackSatisfactionDeclined += 1;
    },
    now: () => Date.parse('2026-06-24T12:00:00.000Z'),
    platform: () => 'ios',
    calls,
    getStorage: () => storage,
    ...overrides,
  };

  return runtime;
}

describe('maybeRequestAppReview', () => {
  it('skips when API flag is disabled', async () => {
    const runtime = createRuntime();
    const result = await maybeRequestAppReview(
      {
        trigger: 'settings_manual',
        inAppReviewEnabled: false,
        storeUrls: STORE_URLS,
      },
      runtime,
    );
    assert.equal(result, false);
    assert.equal(runtime.calls.requestStoreReview, 0);
  });

  it('records attempt and tracks after positive satisfaction', async () => {
    const runtime = createRuntime();
    const result = await maybeRequestAppReview(
      {
        trigger: 'marketplace_listing_created',
        inAppReviewEnabled: true,
        storeUrls: STORE_URLS,
      },
      runtime,
    );
    assert.equal(result, true);
    assert.equal(runtime.calls.requestStoreReview, 1);
    assert.equal(runtime.calls.recordAttempt, 1);
    assert.equal(runtime.calls.trackAttempt, 1);
    assert.deepEqual(runtime.getStorage().seenTriggers, ['marketplace_listing_created']);
  });

  it('redirects to feedback when the user is not enjoying the app', async () => {
    const runtime = createRuntime({
      askSatisfaction: async () => 'not_enjoying',
    });
    const result = await maybeRequestAppReview(
      {
        trigger: 'minibus_live_engaged',
        inAppReviewEnabled: true,
        storeUrls: STORE_URLS,
      },
      runtime,
    );
    assert.equal(result, false);
    assert.equal(runtime.calls.openNegativeFeedback, 1);
    assert.equal(runtime.calls.recordDeclined, 1);
    assert.equal(runtime.calls.trackSatisfactionDeclined, 1);
    assert.equal(runtime.calls.requestStoreReview, 0);
    assert.equal(runtime.calls.recordAttempt, 0);
    assert.deepEqual(runtime.getStorage().seenTriggers, ['minibus_live_engaged']);
  });

  it('does not record automatic trigger decline for manual settings flow', async () => {
    const runtime = createRuntime({
      askSatisfaction: async () => 'not_enjoying',
    });
    const result = await maybeRequestAppReview(
      {
        trigger: 'settings_manual',
        inAppReviewEnabled: true,
        storeUrls: STORE_URLS,
      },
      runtime,
    );
    assert.equal(result, false);
    assert.equal(runtime.calls.openNegativeFeedback, 1);
    assert.equal(runtime.calls.recordDeclined, 0);
    assert.deepEqual(runtime.getStorage().seenTriggers, []);
  });

  it('falls back to store URL when native review is unavailable', async () => {
    const runtime = createRuntime({
      isStoreReviewAvailable: async () => false,
    });
    const result = await maybeRequestAppReview(
      {
        trigger: 'settings_manual',
        inAppReviewEnabled: true,
        storeUrls: STORE_URLS,
      },
      runtime,
    );
    assert.equal(result, true);
    assert.equal(runtime.calls.openStoreUrl, 1);
    assert.equal(runtime.calls.requestStoreReview, 0);
  });

  it('opens the store listing directly for manual settings taps', async () => {
    const runtime = createRuntime();
    const result = await maybeRequestAppReview(
      {
        trigger: 'settings_manual',
        inAppReviewEnabled: true,
        storeUrls: STORE_URLS,
      },
      runtime,
    );
    assert.equal(result, true);
    assert.equal(runtime.calls.openStoreUrl, 1);
    assert.equal(runtime.calls.requestStoreReview, 0);
  });

  it('falls back to store URL when native review throws', async () => {
    const runtime = createRuntime({
      isStoreReviewAvailable: async () => true,
      requestStoreReview: async () => {
        runtime.calls.requestStoreReview += 1;
        throw new Error('review unavailable');
      },
    });
    const result = await maybeRequestAppReview(
      {
        trigger: 'marketplace_listing_created',
        inAppReviewEnabled: true,
        storeUrls: STORE_URLS,
      },
      runtime,
    );
    assert.equal(result, true);
    assert.equal(runtime.calls.requestStoreReview, 1);
    assert.equal(runtime.calls.openStoreUrl, 1);
  });

  it('skips when automatic trigger was already seen', async () => {
    const runtime = createRuntime({
      loadStorage: async () => ({
        ...emptyStorage(),
        seenTriggers: ['transit_search_success_3'],
      }),
    });
    const result = await maybeRequestAppReview(
      {
        trigger: 'transit_search_success_3',
        inAppReviewEnabled: true,
        storeUrls: STORE_URLS,
      },
      runtime,
    );
    assert.equal(result, false);
    assert.equal(runtime.calls.requestStoreReview, 0);
  });

  it('skips store review when satisfaction prompt is dismissed', async () => {
    const runtime = createRuntime({
      askSatisfaction: async () => 'dismissed',
    });
    const result = await maybeRequestAppReview(
      {
        trigger: 'marketplace_review_submitted',
        inAppReviewEnabled: true,
        storeUrls: STORE_URLS,
      },
      runtime,
    );
    assert.equal(result, false);
    assert.equal(runtime.calls.requestStoreReview, 0);
    assert.equal(runtime.calls.recordAttempt, 0);
  });
});
