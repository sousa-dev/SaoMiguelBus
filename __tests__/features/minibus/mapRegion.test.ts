import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isWithinPdlMinibusBounds,
  pdlMinibusMapBounds,
} from '@/features/minibus/lib/mapRegion';

describe('isWithinPdlMinibusBounds', () => {
  it('accepts coordinates inside the PDL minibus network box', () => {
    const lat = (pdlMinibusMapBounds.southWest.lat + pdlMinibusMapBounds.northEast.lat) / 2;
    const lng = (pdlMinibusMapBounds.southWest.lng + pdlMinibusMapBounds.northEast.lng) / 2;
    assert.equal(isWithinPdlMinibusBounds(lat, lng), true);
  });

  it('rejects coordinates outside the PDL minibus network box', () => {
    assert.equal(isWithinPdlMinibusBounds(37.8, -25.2), false);
  });
});
