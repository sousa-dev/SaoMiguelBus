/**
 * 03 §5c / 98 B7: the client currently undoes the server's pair selection.
 *
 * On a loop A -> B -> C -> D -> A, `extractTripSegment` walks to the first name
 * matching the destination, finds A at index 0 before the origin, and returns
 * null — so the server can correctly pick 301's later C -> A (seq 40 -> 59) and
 * the app still throws the trip away.
 *
 * The tie-break must be byte-identical to `transit/services/matcher.py`:
 * earliest BOARD, then shortest ELAPSED DURATION, then board sequence.
 * Never stop count — on 335, with 36 repeated names, fewest-stops picks a hop
 * nobody asked for (98 §5 challenge 4).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  extractTripSegment,
  selectPair,
  stopTimeMinutes,
  validPairs,
  type SequencedStop,
} from '@/lib/trip-segment';
import {
  collapsedStops,
  fullStops,
  loadJourney,
  toSearchResult,
  withDayOffsets,
} from '../fixtures/azoresbus/upstream';

/** Build the matcher's input from fixture stop times, keyed by stop name. */
function sequenced(rows: ReturnType<typeof withDayOffsets>): SequencedStop[] {
  return rows.map((row) => ({
    key: row.name,
    sequence: row.sequence,
    minutes: stopTimeMinutes(row.dayOffset, Math.floor(row.seconds / 3600) % 24, Math.floor((row.seconds % 3600) / 60)),
  }));
}

/** A synthetic trip: [name, 'HH:MM', dayOffset] per stop, 1-based sequences. */
function synthetic(stops: [string, string, number][]): SequencedStop[] {
  return stops.map(([key, hhmm, dayOffset], index) => {
    const [hours, minutes] = hhmm.split(':').map(Number);
    return {
      key,
      sequence: index + 1,
      minutes: stopTimeMinutes(dayOffset, hours, minutes),
    };
  });
}

const LINE_301 = withDayOffsets(loadJourney('journey_25_488.json'));
const LINE_335 = withDayOffsets(loadJourney('journey_48_950.json'));
const LINE_N03 = withDayOffsets(loadJourney('journey_53_984.json'));

const PDL_ALFANDEGA = 'PONTA DELGADA (ALFÂNDEGA)';
const ARRIFES_VALADOS = 'ARRIFES (R. DOS VALADOS)';
const CABOUCO_AMELIA = 'CABOUCO (BAIRRO D. AMÉLIA)';

describe('fixture integrity — the upstream captures still exercise the bug', () => {
  it('301 journey 488 is a loop that revisits its first stop', () => {
    assert.equal(LINE_301.length, 59);
    assert.equal(LINE_301[0].name, PDL_ALFANDEGA);
    assert.equal(LINE_301[58].name, PDL_ALFANDEGA);
    assert.equal(LINE_301[39].name, ARRIFES_VALADOS);
  });

  it('335 journey 950 visits CABOUCO three times', () => {
    const seqs = LINE_335.filter((row) => row.name === CABOUCO_AMELIA).map((r) => r.sequence);
    assert.deepEqual(seqs, [41, 51, 52]);
  });

  it('N03 journey 984 wraps past midnight without exceeding 86400 (98 B2)', () => {
    const wrapped = LINE_N03.find((row) => row.dayOffset === 1);
    assert.equal(wrapped?.sequence, 43);
    assert.ok(LINE_N03.every((row) => row.seconds <= 86400));
  });

  it('the API collapses the 301 stop list from 59 entries to 45', () => {
    assert.equal(collapsedStops(LINE_301).length, 45);
    assert.equal(fullStops(LINE_301).length, 59);
  });
});

describe('selectPair — 98 B7 loop matching', () => {
  it('finds the later leg of a loop that first-occurrence matching drops', () => {
    const pairs = validPairs(sequenced(LINE_301), ARRIFES_VALADOS, PDL_ALFANDEGA);
    assert.equal(pairs.length, 1);
    assert.deepEqual(
      [pairs[0][0].sequence, pairs[0][1].sequence],
      [40, 59],
      'the server picks seq 40 -> 59; the client must agree',
    );
  });

  it('never returns a pair that travels backwards', () => {
    assert.equal(
      selectPair(sequenced(LINE_301), PDL_ALFANDEGA, ARRIFES_VALADOS)?.[0].sequence,
      1,
      'ALFÂNDEGA seq 1 does precede ARRIFES seq 40',
    );
    const backwards = validPairs(
      synthetic([['A', '06:00', 0], ['B', '06:30', 0]]),
      'B',
      'A',
    );
    assert.deepEqual(backwards, []);
  });
});

describe('selectPair — tie-break, identical to matcher.py select_pair', () => {
  it('earliest board wins on 335, where stop count would disagree', () => {
    const pair = selectPair(sequenced(LINE_335), CABOUCO_AMELIA, PDL_ALFANDEGA);
    assert.deepEqual(
      [pair?.[0].sequence, pair?.[1].sequence],
      [41, 96],
      'earliest board is seq 41',
    );

    // The rule we are explicitly NOT using would have picked the shortest hop.
    const pairs = validPairs(sequenced(LINE_335), CABOUCO_AMELIA, PDL_ALFANDEGA);
    const fewestStops = [...pairs].sort(
      (a, b) => b[0].sequence - a[0].sequence,
    )[0];
    assert.equal(fewestStops[0].sequence, 52, 'stop count would have picked seq 52');
  });

  it('shortest elapsed duration breaks a board tie', () => {
    const trip = synthetic([
      ['X', '06:00', 0],
      ['Y', '08:00', 0], // slow leg from this board: 120 min
      ['MID', '06:30', 0],
      ['Y', '06:45', 0], // fast leg from the same board: 45 min
    ]);
    const pair = selectPair(trip, 'X', 'Y');
    assert.equal(pair?.[0].sequence, 1);
    assert.equal(pair?.[1].sequence, 4, 'the longer leg from the same board was selected');
  });

  it('stop count is never the tie-break', () => {
    const trip = synthetic([
      ['X', '06:00', 0],
      ['MID1', '06:10', 0],
      ['MID2', '06:20', 0],
      ['Y', '06:30', 0], // 3 stops, 30 minutes
      ['X', '07:00', 0],
      ['Y', '09:00', 0], // 1 stop, 2 hours
    ]);
    const pair = selectPair(trip, 'X', 'Y');
    assert.deepEqual([pair?.[0].sequence, pair?.[1].sequence], [1, 4]);
  });

  it('returns null when no pair exists', () => {
    assert.equal(selectPair(synthetic([['X', '06:00', 0]]), 'X', 'Y'), null);
  });
});

describe('selectPair — night wrap (98 B2)', () => {
  it('a leg across midnight has a positive elapsed duration', () => {
    const trip = synthetic([['X', '23:15', 0], ['Y', '00:10', 1]]);
    const pair = selectPair(trip, 'X', 'Y');
    assert.equal(pair![1].minutes - pair![0].minutes, 55);
  });

  it('a wrapped leg does not beat an earlier same-day one', () => {
    const trip = synthetic([
      ['X', '22:00', 0],
      ['Y', '22:30', 0],
      ['X', '23:50', 0],
      ['Y', '00:20', 1],
    ]);
    assert.equal(selectPair(trip, 'X', 'Y')?.[0].sequence, 1);
  });

  it('orders N03 by sequence, never by raw time', () => {
    const times = LINE_N03.map((row) => row.seconds);
    const sortedByRawTime = [...times].sort((a, b) => a - b);
    assert.notDeepEqual(times, sortedByRawTime, 'fixture no longer exercises the wrap');
    const minutes = sequenced(LINE_N03).map((row) => row.minutes);
    assert.deepEqual(minutes, [...minutes].sort((a, b) => a - b), 'day offsets restore order');
  });
});

describe('selectPair — board-time filter (02 §3.4)', () => {
  it('returns a late board on a trip that departed early', () => {
    const trip = synthetic([
      ['DEPOT', '06:00', 0],
      ['X', '09:00', 0],
      ['Y', '09:30', 0],
    ]);
    const pair = selectPair(trip, 'X', 'Y', { earliestMinutes: 8 * 60 + 30 });
    assert.equal(pair?.[0].sequence, 2, 'today this trip is dropped because it left at 06:00');
  });

  it('excludes a board before the requested time', () => {
    const trip = synthetic([['X', '06:00', 0], ['Y', '06:30', 0]]);
    assert.equal(selectPair(trip, 'X', 'Y', { earliestMinutes: 8 * 60 + 30 }), null);
  });

  it('picks the first qualifying leg, not the first leg', () => {
    const trip = synthetic([
      ['X', '06:00', 0], ['Y', '06:30', 0],
      ['X', '09:00', 0], ['Y', '09:30', 0],
    ]);
    const pair = selectPair(trip, 'X', 'Y', { earliestMinutes: 8 * 60 + 30 });
    assert.equal(pair?.[0].sequence, 3);
  });
});

describe('extractTripSegment — honours the server pair', () => {
  const loopArgs = {
    id: 488,
    route: '301',
    origin: ARRIFES_VALADOS,
    destination: PDL_ALFANDEGA,
    boardSequence: 40,
    alightSequence: 59,
  };

  it('drops the loop trip today, with no sequence data (this is 98 B7)', () => {
    const legacy = toSearchResult(LINE_301, { ...loopArgs, withoutSequences: true });
    assert.equal(
      extractTripSegment(legacy),
      null,
      'the bug being fixed: the destination name appears at seq 1',
    );
  });

  it('keeps the loop trip once the server sends sequences', () => {
    const segment = extractTripSegment(toSearchResult(LINE_301, loopArgs));
    assert.notEqual(segment, null, '98 B7: the trip must survive');
    assert.equal(segment!.start, '07h03', "the server's board time is authoritative");
    assert.equal(segment!.end, '07h25', "the server's alight time is authoritative");
  });

  it('flags the segment as inexact when the API collapsed the stop list', () => {
    const segment = extractTripSegment(toSearchResult(LINE_301, loopArgs));
    assert.equal(
      segment!.segmentExact,
      false,
      'stops.length 45 < alighting.sequence 59 — the indices cannot be trusted',
    );
    assert.equal(segment!.stops[0].name, ARRIFES_VALADOS);
    assert.equal(segment!.stops[segment!.stops.length - 1].name, PDL_ALFANDEGA);
  });

  it('slices exactly on the sequence indices when the list is intact', () => {
    const segment = extractTripSegment(
      toSearchResult(LINE_301, { ...loopArgs, uncollapsed: true }),
    );
    assert.equal(segment!.segmentExact, true);
    assert.equal(segment!.stops.length, 20, 'seq 40..59 inclusive');
    assert.equal(segment!.stops[0].name, ARRIFES_VALADOS);
    assert.equal(segment!.stops[19].name, PDL_ALFANDEGA);
    assert.equal(segment!.start, '07h03');
    assert.equal(segment!.end, '07h25');
  });

  it('uses fullStops when supplied, even if the wire array was collapsed', () => {
    const segment = extractTripSegment(
      toSearchResult(LINE_301, loopArgs),
      undefined,
      undefined,
      { fullStops: fullStops(LINE_301) },
    );
    assert.equal(segment!.segmentExact, true);
    assert.equal(segment!.stops.length, 20);
  });

  const nightArgs = {
    id: 984,
    route: 'N03',
    origin: LINE_N03[0].name,
    destination: LINE_N03[46].name,
    boardSequence: 1,
    alightSequence: 47,
  };

  it('takes the exact path whenever the array is 1:1 with the sequences', () => {
    const segment = extractTripSegment(
      toSearchResult(LINE_N03, { ...nightArgs, uncollapsed: true }),
    );
    assert.equal(segment!.segmentExact, true);
    assert.equal(segment!.stops.length, 47);
  });

  it('degrades rather than dropping when N03 collapses its 3 repeated names', () => {
    assert.equal(collapsedStops(LINE_N03).length, 44, 'fixture no longer collapses');
    const segment = extractTripSegment(toSearchResult(LINE_N03, nightArgs));
    assert.notEqual(segment, null, 'a night route must never be silently dropped');
    assert.equal(segment!.segmentExact, false);
    assert.equal(segment!.start, '23h15');
    assert.equal(segment!.end, '00h10', 'the wrapped alight time survives');
  });
});
