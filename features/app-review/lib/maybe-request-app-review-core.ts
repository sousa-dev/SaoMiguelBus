import { attemptAppStoreReview } from '@/features/app-review/lib/attempt-app-store-review';
import {
  shouldAttemptAppReview,
  type AppReviewTrigger,
} from '@/features/app-review/lib/should-attempt-app-review';
import {
  incrementTransitSuccessfulSearchCount,
  type AppReviewStorageState,
} from '@/lib/app-review-storage';
import type { AppReviewSatisfaction } from '@/features/app-review/lib/app-review-satisfaction';
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
  askSatisfaction: () => Promise<AppReviewSatisfaction>;
  openNegativeFeedback: (trigger: AppReviewTrigger) => Promise<void>;
  recordDeclined: (
    trigger: AppReviewTrigger,
    previous: AppReviewStorageState,
  ) => Promise<AppReviewStorageState>;
  trackAttempt: (trigger: AppReviewTrigger) => void;
  trackSatisfactionDeclined: (trigger: AppReviewTrigger) => void;
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
      reviewCompletedAt: storage.reviewCompletedAt,
      nowMs,
    })
  ) {
    return false;
  }

  const skipSatisfaction =
    input.trigger === 'settings_manual' && storage.reviewCompletedAt !== null;

  if (!skipSatisfaction) {
    const satisfaction = await runtime.askSatisfaction();
    if (satisfaction === 'dismissed') {
      return false;
    }
    if (satisfaction === 'not_enjoying') {
      await runtime.openNegativeFeedback(input.trigger);
      if (input.trigger !== 'settings_manual') {
        await runtime.recordDeclined(input.trigger, storage);
      }
      runtime.trackSatisfactionDeclined(input.trigger);
      return false;
    }
  }

  const attemptedAt = new Date(nowMs).toISOString();
  const didAttempt = await attemptAppStoreReview(
    {
      trigger: input.trigger,
      platform,
      storeUrls: input.storeUrls,
    },
    runtime,
  );

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
