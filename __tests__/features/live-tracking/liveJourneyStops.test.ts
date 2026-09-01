import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { liveJourneyStopsFromCirculations } from '@/features/live-tracking/lib/liveJourneyStops';
import type { MinibusCirculation } from '@/lib/types';

describe('liveJourneyStopsFromCirculations', () => {
  it('returns empty list for missing circulations', () => {
    assert.deepEqual(liveJourneyStopsFromCirculations(undefined), []);
  });

  it('maps stage positions to stop markers and dedupes loop terminus', () => {
    const circulations: MinibusCirculation[] = [
      {
        sequence: 1,
        stage: {
          id: '201',
          name: 'PRAÇA VASCO DA GAMA',
          position: { lat: 37.7385, lon: -25.670094 },
        },
      },
      {
        sequence: 2,
        stage: {
          id: '202',
          name: 'RUA DO PORTÃO',
          position: { lat: 37.740871, lon: -25.662758 },
        },
      },
      {
        sequence: 22,
        stage: {
          id: '201',
          name: 'PRAÇA VASCO DA GAMA',
          position: { lat: 37.7385, lon: -25.670094 },
        },
      },
    ];

    const stops = liveJourneyStopsFromCirculations(circulations);
    assert.equal(stops.length, 2);
    assert.equal(stops[0].sequence, 1);
    assert.equal(stops[0].name_pt, 'Praça Vasco da Gama');
    assert.equal(stops[0].latitude, 37.7385);
    assert.equal(stops[0].longitude, -25.670094);
    assert.equal(stops[1].sequence, 2);
  });

  it('skips circulations without coordinates', () => {
    const stops = liveJourneyStopsFromCirculations([
      { sequence: 1, stage: { name: 'A' } },
      {
        sequence: 2,
        stage: { name: 'B', position: { lat: 37.74, lon: -25.66 } },
      },
    ]);
    assert.equal(stops.length, 1);
    assert.equal(stops[0].sequence, 2);
  });
});
