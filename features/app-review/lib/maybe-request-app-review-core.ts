import {
  resolveStoreUrl,
  shouldAttemptAppReview,
  type AppReviewTrigger,
} from '@/features/app-review/lib/should-attempt-app-review';
import {
  incrementTransitSuccessfulSearchCount,
  type AppReviewStorageState,
} from '@/lib/app-review-storage';
import type { BootstrapResponse } from '@/lib/types';

export type MaybeRequestAppReviewInput = {
  trigger: AppReviewTrigger;
  inAppReviewEnabled: boolean;
  storeUrls?: BootstrapResponse['storeUrls'];
};

export type AppReviewRuntime = {
  loadStorage: () => Promise<AppReviewStorageState>;
  recordAttempt: (
    trigger: AppReviewTrigger,
    attemptedAt: string,
    previous: AppReviewStorageState,
  ) => Promise<AppReviewStorageState>;
  isStoreReviewAvailable: () => Promise<boolean>;
  requestStoreReview: () => Promise<void>;
  openStoreUrl: (url: string) => Promise<boolean>;
  trackAttempt: (trigger: AppReviewTrigger) => void;
  now: () => number;
  platform: () => 'ios' | 'android' | 'web';
};

export async function maybeRequestAppReview(
  input: MaybeRequestAppReviewInput,
  runtime: AppReviewRuntime,
): Promise<boolean> {
  const platform = runtime.platform();
  const storage = await runtime.loadStorage();
  const nowMs = runtime.now();

  if (
    !shouldAttemptAppReview({
      inAppReviewEnabled: input.inAppReviewEnabled,
      platform,
      trigger: input.trigger,
      attemptCount: storage.attemptCount,
      lastAttemptAt: storage.lastAttemptAt,
      seenTriggers: storage.seenTriggers,
      nowMs,
    })
  ) {
    return false;
  }

  const attemptedAt = new Date(nowMs).toISOString();
  let didAttempt = false;

  if (await runtime.isStoreReviewAvailable()) {
    await runtime.requestStoreReview();
    didAttempt = true;
  } else {
    const storeUrl = resolveStoreUrl(platform, input.storeUrls);
    if (storeUrl) {
      didAttempt = await runtime.openStoreUrl(storeUrl);
    }
  }

  if (!didAttempt) {
    return false;
  }

  await runtime.recordAttempt(input.trigger, attemptedAt, storage);
  runtime.trackAttempt(input.trigger);
  return true;
}

export async function recordTransitSearchSuccessAndMaybeReview(input: {
  resultsCount: number;
  inAppReviewEnabled: boolean;
  storeUrls?: BootstrapResponse['storeUrls'];
  runtime: AppReviewRuntime;
}): Promise<void> {
  if (input.resultsCount <= 0 || !input.inAppReviewEnabled) {
    return;
  }

  const storage = await input.runtime.loadStorage();
  const next = await incrementTransitSuccessfulSearchCount(storage);

  if (next.transitSuccessfulSearchCount !== 3) {
    return;
  }

  await maybeRequestAppReview(
    {
      trigger: 'transit_search_success_3',
      inAppReviewEnabled: input.inAppReviewEnabled,
      storeUrls: input.storeUrls,
    },
    input.runtime,
  );
}
