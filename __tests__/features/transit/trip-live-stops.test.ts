import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { annotateStopTimes } from '@/features/transit/lib/trip-live-stops';
import type { TripStop } from '@/lib/types';

const stops: TripStop[] = [
  { name: 'Ponta Delgada', time: '09h10', sequence: 1 },
  { name: 'Fenais da Luz', time: '09h20', sequence: 2 },
  { name: 'Rabo de Peixe', time: '09h30', sequence: 3 },
];

const formatEta = (minutes: number) => `${minutes}min`;

describe('annotateStopTimes', () => {
  it('appends a live ETA to stops that have one, by sequence', () => {
    const out = annotateStopTimes(
      stops,
      [{ sequence: 3, name: 'Rabo de Peixe', stopId: 9, dueInMinutes: 4 }],
      formatEta,
    );
    assert.equal(out[0].time, '09h10');
    assert.equal(out[1].time, '09h20');
    assert.equal(out[2].time, '09h30 · 4min');
  });

  it('leaves every stop untouched when there is nothing live', () => {
    assert.deepEqual(annotateStopTimes(stops, [], formatEta), stops);
  });

  it('ignores an upcoming entry whose sequence matches no stop', () => {
    const out = annotateStopTimes(
      stops,
      [{ sequence: 99, name: 'Ghost', stopId: null, dueInMinutes: 1 }],
      formatEta,
    );
    assert.deepEqual(out, stops);
  });

  it('skips a stop with no sequence rather than guessing', () => {
    const noSeq: TripStop[] = [{ name: 'Somewhere', time: '10h00' }];
    const out = annotateStopTimes(
      noSeq,
      [{ sequence: 1, name: 'Somewhere', stopId: 1, dueInMinutes: 2 }],
      formatEta,
    );
    assert.deepEqual(out, noSeq);
  });

  it('does not mutate the input array', () => {
    const copy = stops.map((s) => ({ ...s }));
    annotateStopTimes(stops, [{ sequence: 1, name: 'x', stopId: null, dueInMinutes: 0 }], formatEta);
    assert.deepEqual(stops, copy);
  });
});
