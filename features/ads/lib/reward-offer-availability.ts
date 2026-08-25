export type RewardOfferAvailabilityInput = {
  isPremium: boolean;
  isOnline: boolean;
  canInitAdMob: boolean;
  isNativeAvailable: boolean;
  hasRewardedUnit: boolean;
  canRequestAds: boolean;
  rewardedLoaded: boolean;
};

/** True only when a rewarded video is configured, allowed, and loaded. */
export function isRewardOfferAvailable(input: RewardOfferAvailabilityInput): boolean {
  if (input.isPremium || !input.isOnline) {
    return false;
  }
  if (!input.canInitAdMob || !input.isNativeAvailable || !input.hasRewardedUnit) {
    return false;
  }
  return input.canRequestAds && input.rewardedLoaded;
}
