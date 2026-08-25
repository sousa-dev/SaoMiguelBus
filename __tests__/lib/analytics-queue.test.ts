import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseAnalyticsQueue, trimAnalyticsQueue } from '@/lib/analytics-queue-logic';
import { MAX_QUEUE_SIZE, type QueuedAnalyticsEvent } from '@/lib/analytics-queue-types';

describe('analytics queue logic', () => {
  it('parseAnalyticsQueue returns empty for invalid input', () => {
    assert.deepEqual(parseAnalyticsQueue(null), []);
    assert.deepEqual(parseAnalyticsQueue('not-json'), []);
    assert.deepEqual(parseAnalyticsQueue('{}'), []);
  });

  it('trimAnalyticsQueue drops oldest events', () => {
    const events: QueuedAnalyticsEvent[] = Array.from({ length: MAX_QUEUE_SIZE + 3 }, (_, index) => ({
      module: 'transit',
      event_type: 'load',
      properties: { index },
      occurred_at: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
    }));
    const trimmed = trimAnalyticsQueue(events, MAX_QUEUE_SIZE);
    assert.equal(trimmed.length, MAX_QUEUE_SIZE);
    assert.equal(trimmed[0]?.properties?.index, 3);
    assert.equal(trimmed.at(-1)?.properties?.index, MAX_QUEUE_SIZE + 2);
  });
});
