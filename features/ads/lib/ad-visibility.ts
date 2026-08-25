import { isAdFreeActive } from '@/features/ads/lib/ad-free-storage';

/**
 * Whether product ads (first-party, AdMob, internal, fullscreen) may show.
 * Premium users and active ad-free reward windows suppress all ad surfaces.
 */
export function shouldShowAds(
  isPremium: boolean,
  adFreeUntilMs: number | null = null,
  nowMs: number = Date.now(),
): boolean {
  if (isPremium) {
    return false;
  }
  if (isAdFreeActive(adFreeUntilMs, nowMs)) {
    return false;
  }
  return true;
}

/** Remaining ms until ad-free window ends; 0 when inactive or expired. */
export function adFreeRemainingMs(
  adFreeUntilMs: number | null,
  nowMs: number = Date.now(),
): number {
  if (!isAdFreeActive(adFreeUntilMs, nowMs) || adFreeUntilMs == null) {
    return 0;
  }
  return Math.max(0, adFreeUntilMs - nowMs);
}
