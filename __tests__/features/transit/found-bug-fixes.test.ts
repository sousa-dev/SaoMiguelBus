/**
 * Regressions found reviewing the wave that implemented docs/azoresbus/found-bugs.
 *
 * Every case here is a bug that shipped silently — no crash, no error, just a
 * wrong number or a row that quietly vanished. That is exactly the class that
 * comes back without a test pinning it, so each one is written against the
 * contract that was violated rather than against the implementation that fixed it.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { journeyFromTripDetail } from '@/lib/journey-fallback';
import {
  MIN_TRACK_TTL_MS,
  TRACK_GRACE_MS,
  deriveTrackExpiry,
  localIsoDate,
  withDayOffsets,
} from '@/lib/bus-tracking';
import type { TrackedLeg } from '@/lib/profile-store';
import type { TripDetail } from '@/lib/types';

function leg(over: Partial<TrackedLeg> = {}): TrackedLeg {
  return {
    tripId: 1,
    routeNumber: '110',
    origin: 'Ponta Delgada',
    destination: 'Lagoa',
    start: '09h15',
    end: '09h34',
    stops: withDayOffsets([
      { name: 'Ponta Delgada', time: '09h15' },
      { name: 'Lagoa', time: '09h34' },
    ]),
    ...over,
  };
}

describe('localIsoDate — the tracking anchor is a LOCAL date', () => {
  /*
   * `departureDayStart` parses `searchDate` with `new Date(y, m - 1, d)`, which
   * is local midnight. Writing that date with `toISOString()` is UTC, so the two
   * disagreed either side of midnight: in the Azores (UTC-1 in winter) 23h30
   * local is already tomorrow in UTC, and a bus leaving in 15 minutes was
   * anchored to tomorrow's midnight and counted down from ~24h.
   */
  it('late evening still reports today, where toISOString would roll over', () => {
    assert.equal(localIsoDate(new Date(2026, 0, 15, 23, 30)), '2026-01-15');
  });

  it('just after midnight reports the new day', () => {
    assert.equal(localIsoDate(new Date(2026, 0, 16, 0, 5)), '2026-01-16');
  });

  it('pads single-digit months and days', () => {
    assert.equal(localIsoDate(new Date(2026, 8, 2, 12, 0)), '2026-09-02');
  });

  it('agrees with the calendar fields rather than the UTC ones', () => {
    // The property that actually matters, asserted without assuming a TZ: the
    // string is built from the same getters `departureDayStart` reads back.
    const date = new Date(2026, 11, 31, 23, 59);
    assert.equal(
      localIsoDate(date),
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate(),
      ).padStart(2, '0')}`,
    );
  });
});

describe('deriveTrackExpiry — a finished trip still gets a visible row', () => {
  const searchDate = '2026-09-02';

  it('a journey still to come expires half an hour after it arrives', () => {
    const now = new Date(2026, 8, 2, 8, 0).getTime();
    const expiry = deriveTrackExpiry([leg()], searchDate, now);
    const arrival = new Date(2026, 8, 2, 9, 34).getTime();
    assert.equal(expiry, arrival + TRACK_GRACE_MS);
  });

  /*
   * The search form defaults to 00h00, so the results list routinely offers
   * buses that have already run and a rider can track one by accident. A derived
   * expiry in the past made `pruneTracking` delete the row within 30s, with no
   * message — the button simply appeared to do nothing.
   */
  it('a trip that already finished is floored, not expired on arrival', () => {
    const now = new Date(2026, 8, 2, 22, 0).getTime();
    const expiry = deriveTrackExpiry([leg()], searchDate, now);
    assert.ok(expiry > now, 'expiry must be in the future or the row is pruned at once');
    assert.equal(expiry, now + MIN_TRACK_TTL_MS);
  });

  it('the floor never shortens an expiry that is already further out', () => {
    const now = new Date(2026, 8, 2, 8, 0).getTime();
    const expiry = deriveTrackExpiry([leg()], searchDate, now);
    assert.ok(expiry > now + MIN_TRACK_TTL_MS);
  });
});

describe('journeyFromTripDetail — the id cannot collide with a search journey', () => {
  function detail(over: Partial<TripDetail> = {}): TripDetail {
    return {
      id: 1234,
      route: '110',
      typeOfDay: 'weekday',
      likes: 0,
      dislikes: 0,
      information: {},
      stops: [
        { name: 'Ponta Delgada', time: '09h15', sequence: 1 },
        { name: 'Lagoa', time: '09h34', sequence: 9 },
      ],
      ...over,
    } as TripDetail;
  }

  /*
   * The map screen resolves a journey by scanning every ['transit','search']
   * cache for the FIRST id that matches. A search journey's id is
   * `${tripId}-${boardSequence}` (joined by ':' across legs), so a whole-trip
   * journey using that same shape resolved to the search's board..alight slice —
   * the rider asked for the whole line and silently got their own segment.
   */
  it('does not reuse the tripId-sequence shape search journeys use', () => {
    const id = journeyFromTripDetail(detail()).id;
    assert.ok(!/^\d+-\d+$/.test(id), `"${id}" is the search journey id shape`);
  });

  it('is stable for the same trip and distinct across trips', () => {
    assert.equal(journeyFromTripDetail(detail()).id, journeyFromTripDetail(detail()).id);
    assert.notEqual(
      journeyFromTripDetail(detail()).id,
      journeyFromTripDetail(detail({ id: 5678 })).id,
    );
  });

  /*
   * The boarding sequence is deliberately NOT part of the id: this journey is
   * always the whole trip, so a first stop at sequence 1 and one at sequence 7
   * describe the same thing and must not produce two cache entries.
   */
  it('ignores the first stop sequence, which the whole trip does not vary by', () => {
    const fromOne = journeyFromTripDetail(detail());
    const fromSeven = journeyFromTripDetail(
      detail({ stops: [{ name: 'A', time: '09h15', sequence: 7 }, { name: 'B', time: '09h34', sequence: 12 }] }),
    );
    assert.equal(fromOne.id, fromSeven.id);
  });

  it('still describes one ride with no transfers', () => {
    const journey = journeyFromTripDetail(detail());
    assert.equal(journey.transfers, 0);
    assert.equal(journey.legs.filter((l) => l.kind === 'ride').length, 1);
  });
});
