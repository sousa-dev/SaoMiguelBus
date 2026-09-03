import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildLiveTripStart } from '@/lib/live-trip/plan';
import type { ActiveTrack } from '@/lib/profile-store';
import type { LiveTripStrings } from '@/lib/live-trip/types';

const at = (h: number, m: number) => new Date(2026, 8, 2, h, m);

const strings: LiveTripStrings = {
  locale: 'pt',
  title: '{route} → {destination}',
  waiting: 'Parte às {time}',
  riding: 'Próxima paragem {stop} · {minutes} min',
  arriving: 'A chegar a {stop}',
  late: '{minutes} min de atraso',
  onTime: 'À hora',
  stale: 'Sem sinal',
  completed: 'Viagem terminada',
};

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

describe('buildLiveTripStart', () => {
  it('flattens the current leg into a descriptor', () => {
    const result = buildLiveTripStart(
      track,
      strings,
      'https://api.saomiguelbus.com',
      'sao-miguel',
      'session-1',
      at(21, 20),
    );
    assert.ok(result);
    assert.equal(result?.descriptor.activityKey, 't1');
    assert.equal(result?.descriptor.apiBase, 'https://api.saomiguelbus.com');
    assert.equal(result?.descriptor.islandKey, 'sao-miguel');
    assert.equal(result?.descriptor.sessionId, 'session-1');
    assert.equal(result?.descriptor.legs.length, 1);
    assert.equal(result?.descriptor.legs[0].tripId, 1936);
    assert.equal(result?.descriptor.route, 'N05');
    assert.equal(result?.descriptor.destination, 'Ribeira Grande');
    assert.equal(result?.descriptor.eta, '21h59');
    assert.equal(result?.descriptor.deepLink, 'saomiguelhub:///(tabs)/transit/1936');
    assert.equal(result?.strings, strings);
  });

  it('returns null for a legacy-dataset track', () => {
    const legacy = { ...track, dataset: 'legacy' } as ActiveTrack;
    assert.equal(buildLiveTripStart(legacy, strings, 'x', 'sao-miguel', 's', at(21, 20)), null);
  });

  it('returns null when the current leg has no tripId', () => {
    const noId = {
      ...track,
      legs: [{ ...track.legs[0], tripId: undefined }],
    } as unknown as ActiveTrack;
    assert.equal(buildLiveTripStart(noId, strings, 'x', 'sao-miguel', 's', at(21, 20)), null);
  });

  it('returns null once the itinerary has fully completed', () => {
    assert.equal(buildLiveTripStart(track, strings, 'x', 'sao-miguel', 's', at(23, 30)), null);
  });
});
