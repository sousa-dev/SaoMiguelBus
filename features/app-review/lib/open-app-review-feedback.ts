import { router } from 'expo-router';

import type { AppReviewTrigger } from '@/features/app-review/lib/should-attempt-app-review';

export function openAppReviewNegativeFeedback(trigger: AppReviewTrigger): void {
  router.push({
    pathname: '/feedback',
    params: {
      category: 'feedback',
      preset: 'appReview',
      from: 'app-review',
      label: trigger,
    },
  });
}
