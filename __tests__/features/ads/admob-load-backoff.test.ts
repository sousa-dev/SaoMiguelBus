import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ADMOB_LOAD_BACKOFF_INITIAL_MS,
  ADMOB_LOAD_BACKOFF_MAX_MS,
  AdLoadScheduler,
  nextAdLoadBackoffMs,
} from '@/features/ads/lib/admob-load-backoff';

describe('nextAdLoadBackoffMs', () => {
  it('doubles delay until capped', () => {
    assert.equal(nextAdLoadBackoffMs(5_000), 10_000);
    assert.equal(nextAdLoadBackoffMs(80_000), 120_000);
    assert.equal(nextAdLoadBackoffMs(ADMOB_LOAD_BACKOFF_MAX_MS), ADMOB_LOAD_BACKOFF_MAX_MS);
  });
});

describe('AdLoadScheduler', () => {
  it('does not call load() again while a load is in flight', () => {
    let loads = 0;
    const scheduler = new AdLoadScheduler({ onLoad: () => loads += 1 });

    scheduler.requestImmediateLoad();
    scheduler.requestImmediateLoad();

    assert.equal(loads, 1);
    scheduler.cancel();
  });

  it('backs off after errors instead of hammering', () => {
    let loads = 0;
    const scheduler = new AdLoadScheduler({ onLoad: () => loads += 1 });

    scheduler.requestImmediateLoad();
    assert.equal(loads, 1);

    scheduler.markLoadSettled();
    scheduler.scheduleRetryAfterError();
    scheduler.scheduleRetryAfterError();
    assert.equal(loads, 1);

    scheduler.cancel();
  });

  it('resets backoff after a successful load', () => {
    assert.equal(nextAdLoadBackoffMs(ADMOB_LOAD_BACKOFF_INITIAL_MS), 10_000);

    const scheduler = new AdLoadScheduler({ onLoad: () => {} });
    scheduler.requestImmediateLoad();
    scheduler.markLoadSucceeded();

    scheduler.markLoadSettled();
    scheduler.scheduleRetryAfterError();

    scheduler.cancel();
  });
});
