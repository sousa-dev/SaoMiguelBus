import type { AnalyticsPlatform } from '@/lib/platform';

export type AppReviewTrigger =
  | 'minibus_live_engaged'
  | 'marketplace_listing_created'
  | 'marketplace_review_submitted'
  | 'transit_search_success_3'
  | 'settings_manual';

export const APP_REVIEW_MAX_ATTEMPTS = 3;
export const APP_REVIEW_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

export function isNativeStorePlatform(platform: AnalyticsPlatform): platform is 'ios' | 'android' {
  return platform === 'ios' || platform === 'android';
}

export function shouldAttemptAppReview(input: {
  inAppReviewEnabled: boolean;
  platform: AnalyticsPlatform;
  trigger: AppReviewTrigger;
  attemptCount: number;
  lastAttemptAt: string | null;
  seenTriggers: string[];
  nowMs?: number;
}): boolean {
  if (!input.inAppReviewEnabled) {
    return false;
  }
  if (!isNativeStorePlatform(input.platform)) {
    return false;
  }

  if (input.trigger !== 'settings_manual') {
    if (input.attemptCount >= APP_REVIEW_MAX_ATTEMPTS) {
      return false;
    }

    const nowMs = input.nowMs ?? Date.now();
    if (input.lastAttemptAt) {
      const lastAttemptMs = Date.parse(input.lastAttemptAt);
      if (Number.isFinite(lastAttemptMs) && nowMs - lastAttemptMs < APP_REVIEW_COOLDOWN_MS) {
        return false;
      }
    }
  }

  if (input.trigger !== 'settings_manual' && input.seenTriggers.includes(input.trigger)) {
    return false;
  }

  return true;
}

const DEFAULT_STORE_URLS = {
  ios: 'https://apps.apple.com/app/id6777066837',
  android: 'https://play.google.com/store/apps/details?id=com.hsousa_apps.Autocarros',
} as const;

export function resolveStoreUrl(
  platform: AnalyticsPlatform,
  storeUrls?: { ios: string; android: string },
): string | null {
  if (platform === 'ios') {
    return storeUrls?.ios ?? DEFAULT_STORE_URLS.ios;
  }
  if (platform === 'android') {
    return storeUrls?.android ?? DEFAULT_STORE_URLS.android;
  }
  return null;
}
