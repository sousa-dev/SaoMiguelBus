/**
 * Journey search must degrade, never fail.
 *
 * Transfer search is new; direct search has worked for years. If `/transit/journeys`
 * is missing (API not redeployed) or broken (5xx), a rider must still get the
 * direct bus they could always find before — losing Capelas -> Ponta Delgada
 * because the TRANSFER scan broke would be a straight regression.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ApiRequestError } from '@/lib/api-errors';
import {
  journeyFromSearchResult,
  shouldFallBackToDirectSearch,
} from '@/lib/journey-fallback';
import type { TransitSearchResult } from '@/lib/types';

const DIRECT: TransitSearchResult = {
  id: 91,
  route: '315',
  origin: 'Capelas',
  destination: 'Ponta Delgada',
  start: '08h10',
  end: '08h55',
  typeOfDay: 'WEEKDAY',
  likesPercent: 80,
  dislikesPercent: 20,
  information: {},
  stops: [
    { name: 'CAPELAS (IGREJA)', time: '08h10', sequence: 3 },
    { name: 'PONTA DELGADA', time: '08h55', sequence: 21 },
  ],
  boarding: { code: 'A 12', lat: 37.82, lon: -25.67, sequence: 3, dayOffset: 0 },
  alighting: { code: 'B 04', lat: 37.74, lon: -25.67, sequence: 21, dayOffset: 0 },
};

describe('journeyFromSearchResult — direct results as one-leg journeys', () => {
  it('preserves the times a rider acts on', () => {
    const journey = journeyFromSearchResult(DIRECT);

    assert.equal(journey.start, '08h10');
    assert.equal(journey.end, '08h55');
    assert.equal(journey.durationMinutes, 45);
    assert.equal(journey.transfers, 0);
    assert.equal(journey.waitMinutes, 0);
  });

  it('produces exactly one ride leg and no transfer row', () => {
    const journey = journeyFromSearchResult(DIRECT);

    assert.equal(journey.legs.length, 1);
    assert.equal(journey.legs[0].kind, 'ride');
  });

  it('carries the server-chosen sequences through, not re-matched ones', () => {
    const leg = journeyFromSearchResult(DIRECT).legs[0];

    assert.equal(leg.kind, 'ride');
    if (leg.kind !== 'ride') return;
    assert.equal(leg.board.sequence, 3);
    assert.equal(leg.alight.sequence, 21);
    assert.equal(leg.tripId, 91);
    assert.equal(leg.route, '315');
  });

  it('keeps the pole refs when the server sent them', () => {
    const leg = journeyFromSearchResult(DIRECT).legs[0];

    assert.equal(leg.kind, 'ride');
    if (leg.kind !== 'ride') return;
    assert.equal(leg.boarding?.code, 'A 12');
    assert.equal(leg.alighting?.code, 'B 04');
  });

  it('omits pole refs rather than emitting nulls on legacy rows', () => {
    const legacy = { ...DIRECT, boarding: undefined, alighting: undefined };
    const leg = journeyFromSearchResult(legacy).legs[0];

    assert.equal(leg.kind, 'ride');
    if (leg.kind !== 'ride') return;
    assert.ok(!('boarding' in leg));
    assert.ok(!('alighting' in leg));
  });
});

describe('journey search degradation', () => {
  it('degrades when the endpoint does not exist yet', () => {
    assert.equal(shouldFallBackToDirectSearch(new ApiRequestError(404, '', { code: 'not_found' })), true);
  });

  it('degrades when journey search is broken in production', () => {
    for (const status of [500, 502, 503, 504]) {
      assert.equal(
        shouldFallBackToDirectSearch(new ApiRequestError(status, '', { code: 'server_error' })),
        true,
        `${status} must degrade`,
      );
    }
  });

  it('does not swallow a bad request — it would fail the same way on /search', () => {
    assert.equal(
      shouldFallBackToDirectSearch(new ApiRequestError(400, '', { code: 'invalid_params' })),
      false,
    );
  });

  it('does not swallow a network failure — the offline path owns that', () => {
    assert.equal(shouldFallBackToDirectSearch(new TypeError('Network request failed')), false);
  });
});
