import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildTrackingFreshnessLabels,
  formatTrackingIntervalLabel,
  formatTrackingRelativeTime,
} from '@/features/minibus/lib/trackingFreshness';
import type { MinibusTrackingMeta } from '@/lib/types';

const t = {
  relative: ({ count, unit }: { count: number; unit: 'second' | 'minute' }) =>
    unit === 'second' ? `${count}s ago` : `${count}m ago`,
  intervalSeconds: (count: number) => `every ${count}s`,
  intervalMinutes: (count: number) => `every ${count} min`,
};

describe('formatTrackingIntervalLabel', () => {
  it('formats minute intervals from cache TTL', () => {
    assert.equal(formatTrackingIntervalLabel(60, t), 'every 1 min');
  });

  it('formats second intervals when TTL is under one minute', () => {
    assert.equal(formatTrackingIntervalLabel(30, t), 'every 30s');
  });
});

describe('formatTrackingRelativeTime', () => {
  it('formats elapsed minutes from cachedAt', () => {
    const now = Date.parse('2026-06-22T12:02:00.000Z');
    const cachedAt = '2026-06-22T12:00:30.000Z';
    assert.equal(formatTrackingRelativeTime(cachedAt, now, t), '1m ago');
  });
});

describe('buildTrackingFreshnessLabels', () => {
  it('marks stale responses', () => {
    const meta: MinibusTrackingMeta = {
      cachedAt: '2026-06-22T12:00:00.000Z',
      stale: true,
      cacheMaxAgeSeconds: 60,
      trackingAttribution: 'Eleven Systems',
      trackingSourceUrl: 'https://example.test',
    };

    const labels = buildTrackingFreshnessLabels(
      meta,
      t,
      Date.parse('2026-06-22T12:01:30.000Z'),
    );

    assert.equal(labels?.isStale, true);
    assert.equal(labels?.relativeTime, '1m ago');
    assert.equal(labels?.intervalTime, 'every 1 min');
  });
});
