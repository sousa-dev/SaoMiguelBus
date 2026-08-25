import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { extractTripSegment, normalizeStopWords } from '@/lib/transit-format';
import type { TransitSearchResult } from '@/lib/types';

function makeTrip(overrides: Partial<TransitSearchResult> = {}): TransitSearchResult {
  return {
    id: 1,
    route: '104',
    origin: 'Ponta Delgada',
    destination: 'Ribeira Grande',
    start: '06h00',
    end: '08h30',
    typeOfDay: 'WEEKDAY',
    likesPercent: 80,
    dislikesPercent: 5,
    information: {},
    stops: [
      { name: 'Terminal Norte', time: '06h00' },
      { name: 'Ponta Delgada', time: '06h45' },
      { name: 'São Roque', time: '07h10' },
      { name: 'Ribeira Grande', time: '07h55' },
      { name: 'Norte', time: '08h30' },
    ],
    ...overrides,
  };
}

describe('normalizeStopWords', () => {
  it('folds accents and splits words', () => {
    assert.deepEqual(normalizeStopWords('São Roque'), ['sao', 'roque']);
    assert.deepEqual(normalizeStopWords('ribeira grande'), ['ribeira', 'grande']);
  });
});

describe('extractTripSegment', () => {
  it('returns segment times for partial O/D on a longer route', () => {
    const trip = makeTrip();
    const segment = extractTripSegment(trip);
    assert.ok(segment);
    assert.equal(segment.start, '06h45');
    assert.equal(segment.end, '07h55');
    assert.equal(segment.stops.length, 3);
    assert.equal(segment.stops[0]?.name, 'Ponta Delgada');
    assert.equal(segment.stops[segment.stops.length - 1]?.name, 'Ribeira Grande');
  });

  it('matches accent and case variants', () => {
    const trip = makeTrip({
      origin: 'ponta delgada',
      destination: 'ribeira grande',
      stops: [
        { name: 'Ponta Delgada - Centro', time: '06h45' },
        { name: 'Ribeira Grande', time: '07h55' },
      ],
    });
    const segment = extractTripSegment(trip);
    assert.ok(segment);
    assert.equal(segment.start, '06h45');
    assert.equal(segment.end, '07h55');
  });

  it('returns null when destination precedes origin', () => {
    const trip = makeTrip({
      stops: [
        { name: 'Ribeira Grande', time: '06h00' },
        { name: 'Ponta Delgada', time: '07h00' },
      ],
    });
    assert.equal(extractTripSegment(trip), null);
  });

  it('returns null when endpoints are missing', () => {
    const trip = makeTrip({
      stops: [{ name: 'Somewhere Else', time: '06h00' }],
    });
    assert.equal(extractTripSegment(trip), null);
  });

  it('keeps full route when O/D span the entire stop list', () => {
    const trip = makeTrip({
      origin: 'Vila Franca',
      destination: 'Povoação',
      stops: [
        { name: 'Vila Franca', time: '06h00' },
        { name: 'Furnas', time: '07h00' },
        { name: 'Povoação', time: '08h30' },
      ],
    });
    const segment = extractTripSegment(trip);
    assert.ok(segment);
    assert.equal(segment.start, '06h00');
    assert.equal(segment.end, '08h30');
    assert.equal(segment.stops.length, 3);
  });
});
