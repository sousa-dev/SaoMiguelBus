import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getPdlMinibusMapRegion } from '@/features/minibus/lib/mapRegion';

describe('getPdlMinibusMapRegion', () => {
  it('centers on Ponta Delgada, not the island midpoint', () => {
    const region = getPdlMinibusMapRegion();

    assert.ok(region.latitude > 37.73 && region.latitude < 37.76);
    assert.ok(region.longitude < -25.66 && region.longitude > -25.7);
    assert.ok(region.latitudeDelta < 0.05);
    assert.ok(region.longitudeDelta < 0.08);
  });
});
