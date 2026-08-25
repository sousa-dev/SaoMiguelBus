/**
 * 03 §5c step 2 / 98 B7: `offlineSearch` had the same first-occurrence bug as
 * the server and `extractTripSegment` — `stops.indexOf(destKey)` finds the loop's
 * opening stop, decides the origin comes after the destination, and filters the
 * row out. The offline tie-break must match the online one exactly, or the two
 * disagree on precisely the routes that are hardest to notice.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { offlineSearch, type OfflineBundle } from '@/lib/offline-search';

function bundle(routes: OfflineBundle['routes']): OfflineBundle {
  return { version: 'test', stops: [], holidays: [], infos: [], routes, fetchedAt: '' };
}

/** A loop: opens and closes at ALFÂNDEGA, exactly like line 301. */
const LOOP = {
  id: 488,
  route: '301',
  stops: ['Alfândega', 'Bravo', 'Charlie', 'Delta', 'Alfândega'],
  times: ['06h00', '06h30', '07h00', '07h30', '08h00'],
  weekday: 'WEEKDAY',
};

const WEDNESDAY = new Date('2026-09-16T09:00:00Z');

describe('offlineSearch — loop matching', () => {
  it('returns the later leg of a loop instead of discarding it', () => {
    const results = offlineSearch(bundle([LOOP]), {
      origin: 'Charlie',
      destination: 'Alfândega',
      day: 'weekday',
      now: WEDNESDAY,
    });

    assert.equal(results.length, 1, '98 B7: this row is dropped today');
    assert.equal(results[0].start, '07h00');
    assert.equal(results[0].end, '08h00');
    assert.deepEqual(
      results[0].stops.map((stop) => stop.name),
      ['Charlie', 'Delta', 'Alfândega'],
    );
  });

  it('still refuses a pair that would travel backwards', () => {
    const results = offlineSearch(bundle([LOOP]), {
      origin: 'Delta',
      destination: 'Bravo',
      day: 'weekday',
      now: WEDNESDAY,
    });
    assert.deepEqual(results, []);
  });

  it('picks the earliest board, not the fewest stops', () => {
    const repeated = {
      ...LOOP,
      stops: ['X', 'M1', 'M2', 'Y', 'X', 'Y'],
      times: ['06h00', '06h10', '06h20', '06h30', '07h00', '09h00'],
    };
    const results = offlineSearch(bundle([repeated]), {
      origin: 'X',
      destination: 'Y',
      day: 'weekday',
      now: WEDNESDAY,
    });

    assert.equal(results[0].start, '06h00');
    assert.equal(results[0].end, '06h30', 'the one-stop hop at 07h00 is slower');
    assert.equal(results[0].stops.length, 4);
  });

  it('reports the segment as exact — offline rows are never collapsed', () => {
    const results = offlineSearch(bundle([LOOP]), {
      origin: 'Charlie',
      destination: 'Alfândega',
      day: 'weekday',
      now: WEDNESDAY,
    });
    assert.equal(results[0].segmentExact, true);
  });
});

describe('offlineSearch — day type, unchanged', () => {
  it('filters on the resolved weekday', () => {
    const saturdayOnly = { ...LOOP, weekday: 'SATURDAY' };
    assert.deepEqual(
      offlineSearch(bundle([saturdayOnly]), {
        origin: 'Charlie', destination: 'Alfândega', day: 'weekday', now: WEDNESDAY,
      }),
      [],
    );
    assert.equal(
      offlineSearch(bundle([saturdayOnly]), {
        origin: 'Charlie', destination: 'Alfândega', day: 'saturday', now: WEDNESDAY,
      }).length,
      1,
    );
  });

  it('resolves a holiday to Sunday service', () => {
    const sundayOnly = { ...LOOP, weekday: 'SUNDAY' };
    const holidays = [{ date: '2026-12-08' }];
    // 8 December 2026 is a Tuesday and a confirmed holiday (98 claim 10).
    const holidayTuesday = new Date(2026, 11, 8, 9, 0);

    const results = offlineSearch(
      { ...bundle([sundayOnly]), holidays },
      { origin: 'Charlie', destination: 'Alfândega', day: 'weekday', now: holidayTuesday },
    );
    assert.equal(results.length, 1, 'upstream serves the Sunday set on a holiday');
  });

  it('does not shift the holiday a day early west of UTC', () => {
    // `new Date('2026-12-08')` is UTC midnight, so its LOCAL date is 7 December
    // in Atlantic/Azores — the timezone this app serves. Comparing parsed Dates
    // made every holiday fire one day early.
    const sundayOnly = { ...LOOP, weekday: 'SUNDAY' };
    const holidays = [{ date: '2026-12-08' }];
    const dayBefore = new Date(2026, 11, 7, 9, 0);

    assert.deepEqual(
      offlineSearch(
        { ...bundle([sundayOnly]), holidays },
        { origin: 'Charlie', destination: 'Alfândega', day: 'weekday', now: dayBefore },
      ),
      [],
      '7 December is an ordinary Monday',
    );
  });
});
