import * as StoreReview from 'expo-store-review';
import { Linking } from 'react-native';

import { askAppReviewSatisfaction } from '@/features/app-review/lib/app-review-satisfaction';
import {
  maybeRequestAppReview as maybeRequestAppReviewCore,
  recordTransitSearchSuccessAndMaybeReview as recordTransitSearchSuccessAndMaybeReviewCore,
  type AppReviewRuntime,
  type MaybeRequestAppReviewInput,
} from '@/features/app-review/lib/maybe-request-app-review-core';
import { openAppReviewNegativeFeedback } from '@/features/app-review/lib/open-app-review-feedback';
import { track } from '@/lib/analytics';
import {
  loadAppReviewStorage,
  recordAppReviewAttempt,
  recordAppReviewDeclined,
} from '@/lib/app-review-storage';
import i18n from '@/lib/i18n';
import { getAnalyticsPlatform } from '@/lib/platform';
import type { BootstrapResponse } from '@/lib/types';

export type { AppReviewRuntime, MaybeRequestAppReviewInput } from '@/features/app-review/lib/maybe-request-app-review-core';

const defaultRuntime: AppReviewRuntime = {
  loadStorage: loadAppReviewStorage,
  recordAttempt: recordAppReviewAttempt,
  recordDeclined: recordAppReviewDeclined,
  isStoreReviewAvailable: () => StoreReview.isAvailableAsync(),
  requestStoreReview: () => StoreReview.requestReview(),
  openStoreUrl: async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      }
    } catch {
      // canOpenURL can fail for valid https store links on some builds.
    }

    try {
      await Linking.openURL(url);
      return true;
    } catch {
      return false;
    }
  },
  askSatisfaction: () =>
    askAppReviewSatisfaction({
      title: i18n.t('appReviewEnjoyTitle'),
      message: i18n.t('appReviewEnjoyMessage'),
      yesLabel: i18n.t('appReviewEnjoyYes'),
      noLabel: i18n.t('appReviewEnjoyNo'),
    }),
  openNegativeFeedback: async (trigger) => {
    openAppReviewNegativeFeedback(trigger);
  },
  trackAttempt: (trigger) => {
    track('app', 'review_prompt_requested', { trigger });
  },
  trackSatisfactionDeclined: (trigger) => {
    track('app', 'review_prompt_redirected_feedback', { trigger });
  },
  now: () => Date.now(),
  platform: getAnalyticsPlatform,
};

export async function maybeRequestAppReview(
  input: MaybeRequestAppReviewInput,
  runtime: AppReviewRuntime = defaultRuntime,
): Promise<boolean> {
  return maybeRequestAppReviewCore(input, runtime);
}

export async function recordTransitSearchSuccessAndMaybeReview(input: {
  resultsCount: number;
  inAppReviewEnabled: boolean;
  storeUrls?: BootstrapResponse['storeUrls'];
  runtime?: AppReviewRuntime;
}): Promise<void> {
  return recordTransitSearchSuccessAndMaybeReviewCore({
    ...input,
    runtime: input.runtime ?? defaultRuntime,
  });
}
