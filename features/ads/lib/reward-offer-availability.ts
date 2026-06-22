import type { UserType } from '@/lib/types';

export type RewardOfferAvailabilityInput = {
  isPremium: boolean;
  isOnline: boolean;
  userType: UserType | null;
  canInitAdMob: boolean;
  isNativeAvailable: boolean;
  hasRewardedUnit: boolean;
  canRequestAds: boolean;
  rewardedLoaded: boolean;
};

/** Rewarded ad-free is for residents/newcomers — not short-stay tourist passes. */
export function isRewardedAdFreeUserType(userType: UserType | null): boolean {
  return userType !== 'tourist';
}

/** True only when a rewarded video is configured, allowed, and loaded. */
export function isRewardOfferAvailable(input: RewardOfferAvailabilityInput): boolean {
  if (input.isPremium || !input.isOnline) {
    return false;
  }
  if (!isRewardedAdFreeUserType(input.userType)) {
    return false;
  }
  if (!input.canInitAdMob || !input.isNativeAvailable || !input.hasRewardedUnit) {
    return false;
  }
  return input.canRequestAds && input.rewardedLoaded;
}
