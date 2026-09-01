import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  azoresbusFreshnessLabels,
  azoresbusIsStale,
} from '@/features/azoresbus/lib/trackingFreshness';

const t = {
  intervalSeconds: (count: number) => `a cada ${count}s`,
  intervalMinutes: (count: number) => `a cada ${count} min`,
};

const NOW = Date.parse('2026-09-01T12:00:00.000Z');

describe('azoresbusFreshnessLabels', () => {
  it('derives an interval from the poll cadence, with no server metadata', () => {
    const labels = azoresbusFreshnessLabels(NOW - 2_000, t, NOW);
    assert.equal(labels?.intervalTime, 'a cada 1 min');
    assert.ok(labels?.updatedAtTime);
  });

  it('returns null before the first response has landed', () => {
    // The pill itself must still render -- the component owns that decision,
    // not this function, which only has labels to offer once data exists.
    assert.equal(azoresbusFreshnessLabels(undefined, t, NOW), null);
  });
});

describe('azoresbusIsStale', () => {
  it('tolerates a single missed poll', () => {
    assert.equal(azoresbusIsStale(NOW - 70_000, NOW), false);
  });

  it('flags a feed that has stopped', () => {
    // Three polls late at a one-minute cadence.
    assert.equal(azoresbusIsStale(NOW - 200_000, NOW), true);
  });

  it('is not stale when nothing has loaded yet', () => {
    assert.equal(azoresbusIsStale(undefined, NOW), false);
  });
});
