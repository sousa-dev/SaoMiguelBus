import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatCirculationRows } from '@/features/minibus/lib/liveEtas';
import type { MinibusCirculation } from '@/lib/types';

const t = {
  now: 'Now',
  minutes: (count: number) => `${count} min`,
};

describe('formatCirculationRows', () => {
  it('returns empty list for missing circulations', () => {
    assert.deepEqual(formatCirculationRows(undefined, 10, t), []);
  });

  it('sorts by sequence and formats ETAs', () => {
    const circulations: MinibusCirculation[] = [
      { sequence: 12, stage: { nameShort: 'B 12' }, dueInMinutes: 5 },
      { sequence: 10, stage: { nameShort: 'B 10' }, dueInMinutes: 0 },
    ];

    const rows = formatCirculationRows(circulations, 10, t);
    assert.equal(rows[0].sequence, 10);
    assert.equal(rows[0].etaLabel, 'Now');
    assert.equal(rows[0].isCurrent, true);
    assert.equal(rows[1].sequence, 12);
    assert.equal(rows[1].etaLabel, '5 min');
    assert.equal(rows[1].isCurrent, false);
  });
});
