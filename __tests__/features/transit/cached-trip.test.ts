/**
 * Trip detail resolves its dataset from the server date and ignores `?dataset=`,
 * so every AzoresBus trip 404s while previewing — verified live against staging
 * on both a preview-search id (1065) and the id from the field report (1350).
 *
 * The search result the user tapped has everything the detail screen renders, so
 * it is used rather than showing an error.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { findCachedTrip } from '@/features/transit/lib/cached-trip';
import type { TransitSearchResult } from '@/lib/types';

function trip(id: number, route = '101'): TransitSearchResult {
  return {
    id,
    route,
    origin: 'Ponta Delgada',
    destination: 'Ribeira Grande',
    start: '07h15',
    end: '08h05',
    likesPercent: 100,
    dislikesPercent: 0,
    information: {},
    stops: [
      { name: 'Ponta Delgada', time: '07h15' },
      { name: 'Ribeira Grande', time: '08h05' },
    ],
  };
}

describe('findCachedTrip', () => {
  it('finds the trip the user tapped', () => {
    const found = findCachedTrip([[trip(954), trip(1065)]], 1065);
    assert.equal(found?.id, 1065);
  });

  it('searches every cached search, not just the newest', () => {
    assert.equal(findCachedTrip([[trip(954)], undefined, [trip(1065)]], 954)?.id, 954);
  });

  it('prefers the most recent cache when a trip id appears twice', () => {
    // Legacy and AzoresBus PKs come from the same sequence, so an id can be in
    // both networks' results while previewing. The later search is the one the
    // user came from.
    const found = findCachedTrip([[trip(1065, 'legacy-101')], [trip(1065, '101')]], 1065);
    assert.equal(found?.route, '101');
  });

  it('returns null when the trip is not cached', () => {
    assert.equal(findCachedTrip([[trip(954)]], 1350), null);
  });

  it('tolerates empty, undefined and malformed caches', () => {
    assert.equal(findCachedTrip([], 1), null);
    assert.equal(findCachedTrip([undefined, []], 1), null);
    assert.equal(findCachedTrip([undefined as never, null as never], 1), null);
  });

  it('refuses a non-numeric id rather than matching something arbitrary', () => {
    assert.equal(findCachedTrip([[trip(954)]], Number('abc')), null);
  });
});
