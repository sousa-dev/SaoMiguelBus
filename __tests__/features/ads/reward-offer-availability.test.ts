import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isRewardOfferAvailable } from '@/features/ads/lib/reward-offer-availability';

const base = {
  isPremium: false,
  isOnline: true,
  canInitAdMob: true,
  isNativeAvailable: true,
  hasRewardedUnit: true,
  canRequestAds: true,
  rewardedLoaded: true,
};

describe('isRewardOfferAvailable', () => {
  it('is true when all requirements are met', () => {
    assert.equal(isRewardOfferAvailable(base), true);
  });

  it('is false for premium users', () => {
    assert.equal(isRewardOfferAvailable({ ...base, isPremium: true }), false);
  });

  it('is false when offline', () => {
    assert.equal(isRewardOfferAvailable({ ...base, isOnline: false }), false);
  });

  it('is false without rewarded unit', () => {
    assert.equal(isRewardOfferAvailable({ ...base, hasRewardedUnit: false }), false);
  });

  it('is false when UMP blocks ads', () => {
    assert.equal(isRewardOfferAvailable({ ...base, canRequestAds: false }), false);
  });

  it('is false when rewarded ad is not loaded', () => {
    assert.equal(isRewardOfferAvailable({ ...base, rewardedLoaded: false }), false);
  });

  it('is false when AdMob native module is unavailable', () => {
    assert.equal(isRewardOfferAvailable({ ...base, isNativeAvailable: false }), false);
  });

  it('is false when AdMob cannot initialise for the user', () => {
    assert.equal(isRewardOfferAvailable({ ...base, canInitAdMob: false }), false);
  });
});
