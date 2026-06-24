import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  APP_REVIEW_COOLDOWN_MS,
  shouldAttemptAppReview,
} from '@/features/app-review/lib/should-attempt-app-review';

const NOW = Date.parse('2026-06-24T12:00:00.000Z');

describe('shouldAttemptAppReview', () => {
  it('returns false when API flag is disabled', () => {
    assert.equal(
      shouldAttemptAppReview({
        inAppReviewEnabled: false,
        platform: 'ios',
        trigger: 'settings_manual',
        attemptCount: 0,
        lastAttemptAt: null,
        seenTriggers: [],
        nowMs: NOW,
      }),
      false,
    );
  });

  it('returns false on web', () => {
    assert.equal(
      shouldAttemptAppReview({
        inAppReviewEnabled: true,
        platform: 'web',
        trigger: 'settings_manual',
        attemptCount: 0,
        lastAttemptAt: null,
        seenTriggers: [],
        nowMs: NOW,
      }),
      false,
    );
  });

  it('returns false when attempt cap reached', () => {
    assert.equal(
      shouldAttemptAppReview({
        inAppReviewEnabled: true,
        platform: 'android',
        trigger: 'settings_manual',
        attemptCount: 3,
        lastAttemptAt: null,
        seenTriggers: [],
        nowMs: NOW,
      }),
      false,
    );
  });

  it('returns false during cooldown', () => {
    assert.equal(
      shouldAttemptAppReview({
        inAppReviewEnabled: true,
        platform: 'ios',
        trigger: 'settings_manual',
        attemptCount: 1,
        lastAttemptAt: new Date(NOW - APP_REVIEW_COOLDOWN_MS + 1000).toISOString(),
        seenTriggers: [],
        nowMs: NOW,
      }),
      false,
    );
  });

  it('returns false when automatic trigger was already seen', () => {
    assert.equal(
      shouldAttemptAppReview({
        inAppReviewEnabled: true,
        platform: 'ios',
        trigger: 'minibus_live_engaged',
        attemptCount: 0,
        lastAttemptAt: null,
        seenTriggers: ['minibus_live_engaged'],
        nowMs: NOW,
      }),
      false,
    );
  });

  it('allows manual trigger even when another trigger was seen', () => {
    assert.equal(
      shouldAttemptAppReview({
        inAppReviewEnabled: true,
        platform: 'ios',
        trigger: 'settings_manual',
        attemptCount: 0,
        lastAttemptAt: null,
        seenTriggers: ['minibus_live_engaged'],
        nowMs: NOW,
      }),
      true,
    );
  });

  it('returns true when all guards pass', () => {
    assert.equal(
      shouldAttemptAppReview({
        inAppReviewEnabled: true,
        platform: 'android',
        trigger: 'marketplace_listing_created',
        attemptCount: 1,
        lastAttemptAt: new Date(NOW - APP_REVIEW_COOLDOWN_MS - 1000).toISOString(),
        seenTriggers: [],
        nowMs: NOW,
      }),
      true,
    );
  });
});
