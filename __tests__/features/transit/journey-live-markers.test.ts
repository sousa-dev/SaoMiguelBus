import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  journeyLiveVehicles,
  journeyRideTripIds,
  LIVE_VEHICLE_COLOR,
} from '@/features/transit/lib/journey-live-markers';
import type { TransitJourney, TransitTripLive } from '@/lib/types';

const journey = {
  id: 'j1',
  legs: [
    { kind: 'ride', tripId: 41, route: '110' },
    { kind: 'transfer' },
    { kind: 'ride', tripId: 42, route: '302' },
  ],
} as unknown as TransitJourney;

const live = (tripId: number): TransitTripLive => ({
  tripId,
  state: 'live',
  vehicle: {
    id: `v${tripId}`,
    position: { lat: 37.8, lon: -25.5 },
    delaySeconds: 0,
    speed: 0,
    status: 'idleAt',
    currentStopSequence: 1,
    nextStop: null,
    upcomingStops: [],
    capturedAt: '',
    stale: false,
  },
});

describe('journeyLiveVehicles', () => {
  it('labels each live bus with its leg route and the fixed live color', () => {
    const out = journeyLiveVehicles(journey, [
      live(42),
      { tripId: 41, state: 'not_found', vehicle: null },
    ]);
    assert.deepEqual(out, [
      { id: 'v42', position: { lat: 37.8, lon: -25.5 }, label: '302', color: LIVE_VEHICLE_COLOR },
    ]);
  });

  it('is empty when nothing is live', () => {
    assert.deepEqual(journeyLiveVehicles(journey, []), []);
  });
});

describe('journeyRideTripIds', () => {
  it('lists every ride leg trip id, skipping transfers', () => {
    assert.deepEqual(journeyRideTripIds(journey), [41, 42]);
  });

  it('is empty for no journey', () => {
    assert.deepEqual(journeyRideTripIds(null), []);
  });
});
