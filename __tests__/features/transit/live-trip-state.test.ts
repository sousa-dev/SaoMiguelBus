import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { currentLegIndex, liveTripLegWindows } from '@/features/transit/lib/live-trip-legs';
import { liveTripSnapshotFrom } from '@/features/transit/lib/live-trip-state';
import type { ActiveTrack } from '@/lib/profile-store';
import type { TransitTripLive } from '@/lib/types';

// Every instant is built locally so assertions hold in any CI timezone (same
// rule as __tests__/lib/bus-tracking-spans.test.ts).
const at = (h: number, m: number) => new Date(2026, 8, 2, h, m);

const track = {
  id: 't1',
  routeNumber: 'N05',
  origin: 'Ponta Delgada',
  destination: 'Ribeira Grande',
  searchDay: 'weekday',
  searchDate: '2026-09-02',
  dataset: 'azoresbus',
  legs: [
    {
      tripId: 1936,
      routeNumber: 'N05',
      origin: 'Ponta Delgada',
      destination: 'Ribeira Grande',
      start: '21h15',
      end: '21h59',
      boardSequence: 1,
      alightSequence: 5,
      stops: [
        { name: 'Ponta Delgada', time: '21h15', sequence: 1 },
        { name: 'Fenais da Luz', time: '21h30', sequence: 2 },
        { name: 'Pico da Pedra', time: '21h45', sequence: 3 },
        { name: 'Ribeira Grande', time: '21h59', sequence: 5 },
      ],
    },
  ],
  transfers: [],
  nextDeparture: '21h15',
  estimatedArrival: '21h59',
  expiresAt: at(23, 0).getTime(),
  createdAt: at(20, 0).getTime(),
} as unknown as ActiveTrack;

const live = (
  over: Partial<NonNullable<TransitTripLive['vehicle']>> = {},
): TransitTripLive => ({
  tripId: 1936,
  state: 'live',
  vehicle: {
    id: 'v1',
    position: { lat: 37.8, lon: -25.6 },
    delaySeconds: 240,
    speed: 30,
    status: 'inTransitTo',
    currentStopSequence: 2,
    nextStop: { sequence: 3, name: 'Pico da Pedra', stopId: 9, dueInMinutes: 4 },
    upcomingStops: [{ sequence: 3, name: 'Pico da Pedra', stopId: 9, dueInMinutes: 4 }],
    capturedAt: at(21, 41).toISOString(),
    stale: false,
    ...over,
  },
});

describe('liveTripLegWindows / currentLegIndex', () => {
  it('gives one absolute-minute window per leg with a tripId', () => {
    const windows = liveTripLegWindows(track);
    assert.equal(windows.length, 1);
    assert.equal(windows[0].tripId, 1936);
    assert.equal(windows[0].startMinutes, 21 * 60 + 15);
    assert.equal(windows[0].endMinutes, 21 * 60 + 59);
  });

  it('skips legs without a tripId', () => {
    const noId = { ...track, legs: [{ ...track.legs[0], tripId: undefined }] } as ActiveTrack;
    assert.deepEqual(liveTripLegWindows(noId), []);
  });

  it('picks the leg containing now, else the next one, else the last', () => {
    const w = [
      { tripId: 1, startMinutes: 100, endMinutes: 200 },
      { tripId: 2, startMinutes: 260, endMinutes: 320 },
    ];
    assert.equal(currentLegIndex(w, 50), 0); // before everything -> first
    assert.equal(currentLegIndex(w, 150), 0); // inside leg 0
    assert.equal(currentLegIndex(w, 230), 1); // in the gap -> the one about to board
    assert.equal(currentLegIndex(w, 300), 1); // inside leg 1
    assert.equal(currentLegIndex(w, 999), 1); // past everything -> last
  });

  it('is empty for a track with no legs, and index 0 for empty windows', () => {
    assert.deepEqual(liveTripLegWindows({ ...track, legs: [] } as ActiveTrack), []);
    assert.equal(currentLegIndex([], 123), 0);
  });
});

describe('liveTripSnapshotFrom', () => {
  it('reports riding with the live next stop and rounded delay', () => {
    const s = liveTripSnapshotFrom(track, 0, live(), at(21, 45));
    assert.equal(s.v, 1);
    assert.equal(s.state, 'riding');
    assert.equal(s.nextStopName, 'Pico da Pedra');
    assert.equal(s.minutesToNextStop, 4);
    assert.equal(s.delayMinutes, 4);
    assert.equal(s.state !== 'stale', true);
    assert.ok(s.progress > 0 && s.progress < 1);
  });

  it('reports arriving when the next stop is due imminently', () => {
    const s = liveTripSnapshotFrom(
      track,
      0,
      live({ nextStop: { sequence: 3, name: 'Pico da Pedra', stopId: 9, dueInMinutes: 1 }, upcomingStops: [{ sequence: 3, name: 'Pico da Pedra', stopId: 9, dueInMinutes: 1 }] }),
      at(21, 45),
    );
    assert.equal(s.state, 'arriving');
  });

  it('is waiting before departure, with no live bus attributed', () => {
    const s = liveTripSnapshotFrom(
      track,
      0,
      { tripId: 1936, state: 'not_found', vehicle: null },
      at(21, 0),
    );
    assert.equal(s.state, 'waiting');
    assert.equal(s.nextStopName, null);
    assert.equal(s.minutesToNextStop, null);
    assert.equal(s.progress, 0);
  });

  it('is completed past the last stop', () => {
    const s = liveTripSnapshotFrom(
      track,
      0,
      { tripId: 1936, state: 'not_found', vehicle: null },
      at(22, 30),
    );
    assert.equal(s.state, 'completed');
    assert.equal(s.progress, 1);
  });

  it('carries a stale reading through but drops the numbers it cannot trust', () => {
    const s = liveTripSnapshotFrom(
      track,
      0,
      live({ stale: true, nextStop: null, upcomingStops: [] }),
      at(21, 45),
    );
    assert.equal(s.state, 'stale');
    assert.equal(s.nextStopName, null);
    assert.equal(s.minutesToNextStop, null);
    // Delay still comes from the fleet-list `delay` field, which is real even
    // when the detail (and therefore the stop ETAs) could not be re-read.
    assert.equal(s.delayMinutes, 4);
  });

  it('is null-safe when the row itself is null (no live attribution attempted yet)', () => {
    const s = liveTripSnapshotFrom(track, 0, null, at(21, 20));
    assert.equal(s.state, 'riding');
    assert.equal(s.nextStopName, null);
  });
});
