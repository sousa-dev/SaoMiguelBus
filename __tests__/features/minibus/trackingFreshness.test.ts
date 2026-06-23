import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildTrackingFreshnessLabels,
  formatTrackingIntervalLabel,
  formatTrackingUpdatedAtTime,
} from '@/features/minibus/lib/trackingFreshness';
import { formatLocalTime } from '@/lib/format-time';
import type { MinibusTrackingMeta } from '@/lib/types';

const t = {
  intervalSeconds: (count: number) => `every ${count}s`,
  intervalMinutes: (count: number) => `every ${count} min`,
};

describe('formatTrackingUpdatedAtTime', () => {
  it('formats cachedAt as a local clock time in parentheses', () => {
    const cachedAt = '2026-06-22T12:51:00.000Z';
    assert.equal(formatTrackingUpdatedAtTime(cachedAt, 'en'), `(${formatLocalTime(cachedAt, 'en')})`);
  });
});

describe('formatTrackingIntervalLabel', () => {
  it('formats minute intervals from cache TTL', () => {
    assert.equal(formatTrackingIntervalLabel(60, t), 'every 1 min');
  });

  it('formats second intervals when TTL is under one minute', () => {
    assert.equal(formatTrackingIntervalLabel(30, t), 'every 30s');
  });
});

describe('buildTrackingFreshnessLabels', () => {
  it('returns updated clock time and interval labels', () => {
    const meta: MinibusTrackingMeta = {
      cachedAt: '2026-06-22T12:51:00.000Z',
      stale: true,
      cacheMaxAgeSeconds: 60,
      trackingAttribution: 'Eleven Systems',
      trackingSourceUrl: 'https://example.test',
    };

    const labels = buildTrackingFreshnessLabels(meta, t, 'en');

    assert.equal(labels?.isStale, true);
    assert.equal(labels?.updatedAtTime, `(${formatLocalTime(meta.cachedAt, 'en')})`);
    assert.equal(labels?.intervalTime, 'every 1 min');
  });
});
