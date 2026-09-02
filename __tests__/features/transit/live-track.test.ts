import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  applyLiveToJourney,
  journeyLiveFootnote,
  liveTripIds,
  uniqueLiveTripIds,
} from '@/features/transit/lib/live-track';
import { computeJourneyStatus } from '@/lib/bus-tracking';
import type { ActiveTrack } from '@/lib/profile-store';
import type { TransitTripLive } from '@/lib/types';

// Every instant is built locally so the assertions hold in any CI timezone.
const DAY = '2026-09-02';
const at = (h: number, m: number) => new Date(2026, 8, 2, h, m);

const track: ActiveTrack = {
  id: 't1',
  routeNumber: '110',
  origin: 'Ponta Delgada',
  destination: 'Ribeira Grande',
  searchDay: 'weekday',
  searchDate: DAY,
  dataset: 'azoresbus',
  legs: [
    {
      tripId: 41,
      routeNumber: '110',
      origin: 'Ponta Delgada',
      destination: 'Ribeira Grande',
      start: '09h10',
      end: '09h50',
      boardSequence: 1,
      alightSequence: 5,
      stops: [
        { name: 'Ponta Delgada', time: '09h10', sequence: 1 },
        { name: 'Fenais da Luz', time: '09h20', sequence: 2 },
        { name: 'Rabo de Peixe', time: '09h30', sequence: 3 },
        { name: 'Ribeirinha', time: '09h40', sequence: 4 },
        { name: 'Ribeira Grande', time: '09h50', sequence: 5 },
      ],
    },
  ],
  transfers: [],
  nextDeparture: '09h10',
  estimatedArrival: '09h50',
  expiresAt: at(10, 20).getTime(),
  createdAt: at(8, 0).getTime(),
};

const vehicle = (
  currentStopSequence: number | null,
  extra: Partial<NonNullable<TransitTripLive['vehicle']>> = {},
): TransitTripLive => ({
  tripId: 41,
  state: 'live',
  vehicle: {
    id: 'v1',
    position: { lat: 37.8, lon: -25.6 },
    delaySeconds: 240,
    speed: 30,
    status: 'inTransitTo',
    currentStopSequence,
    nextStop: { sequence: 3, name: 'Rabo de Peixe', stopId: 9, dueInMinutes: 4 },
    upcomingStops: [{ sequence: 3, name: 'Rabo de Peixe', stopId: 9, dueInMinutes: 4 }],
    capturedAt: at(9, 24).toISOString(),
    stale: false,
    ...extra,
  },
});

describe('liveTripIds', () => {
  it('asks for nothing hours before departure', () => {
    const now = at(7, 0);
    assert.deepEqual(liveTripIds(track, computeJourneyStatus(track, now), now), []);
  });

  it('asks within the lookahead window and while riding', () => {
    for (const now of [at(8, 40), at(9, 25)]) {
      assert.deepEqual(liveTripIds(track, computeJourneyStatus(track, now), now), [41]);
    }
  });

  it('asks for nothing once completed, on legacy, or without trip ids', () => {
    const done = at(10, 5);
    assert.deepEqual(liveTripIds(track, computeJourneyStatus(track, done), done), []);
    const legacy = { ...track, dataset: 'legacy' as const };
    assert.deepEqual(liveTripIds(legacy, computeJourneyStatus(legacy, at(9, 25)), at(9, 25)), []);
    const noId = { ...track, legs: [{ ...track.legs[0], tripId: undefined }] };
    assert.deepEqual(liveTripIds(noId, computeJourneyStatus(noId, at(9, 25)), at(9, 25)), []);
  });

  it('uniqueLiveTripIds dedupes across tracks', () => {
    const now = at(9, 25);
    const views = [
      { track, journey: computeJourneyStatus(track, now) },
      { track: { ...track, id: 't2' }, journey: computeJourneyStatus(track, now) },
    ];
    assert.deepEqual(uniqueLiveTripIds(views, now), [41]);
  });
});

describe('applyLiveToJourney', () => {
  it('returns the timetable status untouched with live=null when nothing is live', () => {
    const now = at(9, 25);
    const journey = computeJourneyStatus(track, now);
    const merged = applyLiveToJourney(
      journey,
      track,
      [{ tripId: 41, state: 'not_found', vehicle: null }],
      now,
    );
    assert.equal(merged.live, null);
    assert.equal(merged.currentStop?.name, 'Fenais da Luz');
  });

  it('places the rider where the bus actually is, not where the clock says', () => {
    // At 09:45 the timetable puts the bus near Ribeirinha (seq 4). Upstream says
    // it has only passed Fenais da Luz (seq 2) and is 4 min from Rabo de Peixe.
    const now = at(9, 45);
    const journey = computeJourneyStatus(track, now);
    const merged = applyLiveToJourney(journey, track, [vehicle(2)], now);
    assert.equal(merged.phase, 'riding');
    assert.equal(merged.live?.vehicleId, 'v1');
    assert.equal(merged.live?.delayMinutes, 4);
    assert.equal(merged.currentStop?.name, 'Fenais da Luz');
    assert.equal(merged.nextStop?.name, 'Rabo de Peixe');
    assert.equal(merged.timeToNextStopMin, 4);
    assert.equal(merged.legs[0].state, 'riding');
    assert.equal(merged.legs[0].progress, 25); // 1 of 4 segments done
    assert.equal(merged.statusLabel.key, 'trackStatusApproaching');
  });

  it('keeps the waiting phase when the bus has not reached the boarding stop', () => {
    const track2 = {
      ...track,
      legs: [{ ...track.legs[0], boardSequence: 3, stops: track.legs[0].stops.slice(2) }],
    };
    const now = at(9, 25);
    const journey = computeJourneyStatus(track2, now);
    const merged = applyLiveToJourney(journey, track2, [vehicle(1)], now);
    assert.equal(merged.phase, journey.phase);
    assert.equal(merged.currentStop?.name, journey.currentStop?.name);
    assert.equal(merged.live?.delayMinutes, 4);
  });

  it('ignores a vehicle already past the alighting stop', () => {
    const now = at(9, 45);
    const journey = computeJourneyStatus(track, now);
    const merged = applyLiveToJourney(journey, track, [vehicle(5)], now);
    assert.equal(merged.live, null);
    assert.deepEqual(merged.currentStop, journey.currentStop);
  });

  it('attaches live info but does not move the rider when the sequence is unknown', () => {
    const now = at(9, 25);
    const journey = computeJourneyStatus(track, now);
    const merged = applyLiveToJourney(
      journey,
      track,
      [vehicle(null, { stale: true, nextStop: null })],
      now,
    );
    assert.equal(merged.live?.stale, true);
    assert.deepEqual(merged.currentStop, journey.currentStop);
  });
});

describe('journeyLiveFootnote', () => {
  const now = at(9, 25);
  const base = computeJourneyStatus(track, now);

  it('is the timetable disclaimer without live data', () => {
    assert.deepEqual(journeyLiveFootnote(base, now), { key: 'trackPositionEstimated' });
  });

  it('says late / early / on time from the delay', () => {
    const late = applyLiveToJourney(base, track, [vehicle(2)], now);
    assert.deepEqual(journeyLiveFootnote(late, now), {
      key: 'trackPositionLiveLate',
      params: { minutes: 4 },
    });
    const early = applyLiveToJourney(base, track, [vehicle(2, { delaySeconds: -180 })], now);
    assert.deepEqual(journeyLiveFootnote(early, now), {
      key: 'trackPositionLiveEarly',
      params: { minutes: 3 },
    });
    const onTime = applyLiveToJourney(base, track, [vehicle(2, { delaySeconds: 30 })], now);
    assert.deepEqual(journeyLiveFootnote(onTime, now), { key: 'trackPositionLiveOnTime' });
  });

  it('flags a reading older than three minutes or marked stale', () => {
    const old = applyLiveToJourney(base, track, [vehicle(2)], at(9, 29));
    assert.deepEqual(journeyLiveFootnote(old, at(9, 29)), {
      key: 'trackPositionLiveStale',
      params: { minutes: 5 },
    });
    const stale = applyLiveToJourney(base, track, [vehicle(2, { stale: true })], now);
    assert.equal(journeyLiveFootnote(stale, now).key, 'trackPositionLiveStale');
  });
});
