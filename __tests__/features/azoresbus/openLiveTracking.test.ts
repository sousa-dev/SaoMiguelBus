import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  azoresbusLiveHref,
  azoresbusLiveVehicleHref,
} from '@/features/azoresbus/lib/liveHref';

describe('azoresbusLiveHref', () => {
  it('omits the query entirely when no line is selected', () => {
    assert.equal(azoresbusLiveHref(), '/(tabs)/transit/live');
    assert.equal(azoresbusLiveHref(null), '/(tabs)/transit/live');
    assert.equal(azoresbusLiveHref(''), '/(tabs)/transit/live');
  });

  it('deep-links to a line', () => {
    assert.equal(azoresbusLiveHref('311'), '/(tabs)/transit/live?line=311');
  });

  it('encodes codes that are not URL-safe', () => {
    assert.equal(azoresbusLiveHref('N 01'), '/(tabs)/transit/live?line=N%2001');
  });
});

describe('azoresbusLiveVehicleHref', () => {
  it('deep-links to one bus without filtering the map to its line', () => {
    // Arriving from a stop means "show me THIS bus"; narrowing to its line
    // would hide the alternatives the rider might switch to.
    assert.equal(
      azoresbusLiveVehicleHref('11011201'),
      '/(tabs)/transit/live?vehicle=11011201',
    );
  });

  it('encodes ids that are not URL-safe', () => {
    assert.equal(
      azoresbusLiveVehicleHref('bus 1/2'),
      '/(tabs)/transit/live?vehicle=bus%201%2F2',
    );
  });
});
