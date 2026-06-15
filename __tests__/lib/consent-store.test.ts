import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  canInitAdMobFromState,
  canShowPersonalizedAdsFromState,
} from '@/lib/consent-gates';

describe('consent gates', () => {
  it('canInitAdMobFromState is true when decided and free', () => {
    assert.equal(canInitAdMobFromState(true, false), true);
  });

  it('canInitAdMobFromState is false when premium', () => {
    assert.equal(canInitAdMobFromState(true, true), false);
  });

  it('canInitAdMobFromState is false when CMP undecided', () => {
    assert.equal(canInitAdMobFromState(false, false), false);
  });

  it('canShowPersonalizedAdsFromState requires ads purpose', () => {
    assert.equal(canShowPersonalizedAdsFromState(true, true), true);
    assert.equal(canShowPersonalizedAdsFromState(true, false), false);
  });

  it('rejectNonEssential still allows AdMob init for free users', () => {
    assert.equal(canShowPersonalizedAdsFromState(true, false), false);
    assert.equal(canInitAdMobFromState(true, false), true);
  });
});
