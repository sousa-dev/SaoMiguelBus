import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { arrivalsProps, liveVehicleProps } from '@/features/azoresbus/lib/live-analytics-props';

describe('arrivalsProps', () => {
  it('records an empty result rather than omitting it', () => {
    // "Nothing running" and "the feed broke" must stay distinguishable in the
    // data, or a quiet stop looks like an outage.
    assert.deepEqual(arrivalsProps('stop_page', []), {
      source: 'stop_page',
      count: '0',
      stale: '0',
    });
  });

  it('counts how many estimates were extrapolated', () => {
    assert.deepEqual(
      arrivalsProps('stop_search', [{ stale: false }, { stale: true }, { stale: true }]),
      { source: 'stop_search', count: '3', stale: '2' },
    );
  });
});

describe('liveVehicleProps', () => {
  it('labels an unmapped vehicle rather than dropping the line key', () => {
    assert.deepEqual(liveVehicleProps('bus1', null), {
      vehicle: 'bus1',
      line: 'unknown',
    });
  });
});
