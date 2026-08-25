import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  minibusTrackingPollIntervalMs,
  minibusTrackingStaleTimeMs,
} from '@/features/minibus/lib/trackingPollInterval';
import type { MinibusTrackingMeta } from '@/lib/types';

const sampleMeta = (cacheMaxAgeSeconds: number): MinibusTrackingMeta => ({
  cachedAt: '2026-06-22T12:51:00.000Z',
  stale: false,
  cacheMaxAgeSeconds,
  trackingAttribution: 'Eleven Systems',
  trackingSourceUrl: 'https://example.test',
});

describe('minibusTrackingPollIntervalMs', () => {
  it('uses cacheMaxAgeSeconds from API meta', () => {
    assert.equal(minibusTrackingPollIntervalMs(sampleMeta(60)), 60_000);
  });

  it('falls back to 10s when meta is missing', () => {
    assert.equal(minibusTrackingPollIntervalMs(undefined), 10_000);
    assert.equal(minibusTrackingPollIntervalMs(null), 10_000);
  });

  it('falls back to 10s when cacheMaxAgeSeconds is invalid', () => {
    assert.equal(minibusTrackingPollIntervalMs(sampleMeta(0)), 10_000);
    assert.equal(minibusTrackingPollIntervalMs({ ...sampleMeta(60), cacheMaxAgeSeconds: -1 }), 10_000);
  });
});

describe('minibusTrackingStaleTimeMs', () => {
  it('matches poll interval from the same meta', () => {
    const meta = sampleMeta(45);
    assert.equal(minibusTrackingStaleTimeMs(meta), minibusTrackingPollIntervalMs(meta));
  });
});
