import {
  resolveStoreUrl,
  type AppReviewTrigger,
} from '@/features/app-review/lib/should-attempt-app-review';
import type { AppReviewRuntime } from '@/features/app-review/lib/maybe-request-app-review-core';
import type { AnalyticsPlatform } from '@/lib/platform';
import type { BootstrapResponse } from '@/lib/types';

type AttemptAppStoreReviewInput = {
  trigger: AppReviewTrigger;
  platform: AnalyticsPlatform;
  storeUrls?: BootstrapResponse['storeUrls'];
};

type AttemptAppStoreReviewRuntime = Pick<
  AppReviewRuntime,
  'isStoreReviewAvailable' | 'requestStoreReview' | 'openStoreUrl'
>;

export async function attemptAppStoreReview(
  input: AttemptAppStoreReviewInput,
  runtime: AttemptAppStoreReviewRuntime,
): Promise<boolean> {
  const storeUrl = resolveStoreUrl(input.platform, input.storeUrls);

  if (input.trigger === 'settings_manual') {
    if (storeUrl) {
      return runtime.openStoreUrl(storeUrl);
    }
    if (await runtime.isStoreReviewAvailable()) {
      await runtime.requestStoreReview();
      return true;
    }
    return false;
  }

  const nativeAvailable = await runtime.isStoreReviewAvailable();
  if (nativeAvailable) {
    try {
      await runtime.requestStoreReview();
      return true;
    } catch {
      if (storeUrl) {
        return runtime.openStoreUrl(storeUrl);
      }
      return false;
    }
  }

  if (storeUrl) {
    return runtime.openStoreUrl(storeUrl);
  }

  return false;
}
