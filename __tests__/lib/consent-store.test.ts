import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  canInitAdMobFromState,
  canShowPersonalizedAdsFromState,
} from '@/lib/consent-gates';

describe('consent gates', () => {
  it('canInitAdMobFromState is true when decided and ads should show', () => {
    assert.equal(canInitAdMobFromState(true, true), true);
  });

  it('canInitAdMobFromState is false when ads should not show', () => {
    assert.equal(canInitAdMobFromState(true, false), false);
  });

  it('canInitAdMobFromState is false when CMP undecided', () => {
    assert.equal(canInitAdMobFromState(false, true), false);
  });

  it('canShowPersonalizedAdsFromState requires ads purpose', () => {
    assert.equal(canShowPersonalizedAdsFromState(true, true), true);
    assert.equal(canShowPersonalizedAdsFromState(true, false), false);
  });

  it('rejectNonEssential still allows AdMob init when ads should show', () => {
    assert.equal(canShowPersonalizedAdsFromState(true, false), false);
    assert.equal(canInitAdMobFromState(true, true), true);
  });
});
