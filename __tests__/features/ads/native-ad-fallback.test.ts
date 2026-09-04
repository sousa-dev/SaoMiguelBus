import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { needsInternalCreative } from '@/features/ads/lib/ad-slot';

/**
 * A Native Advanced request can come back with no fill, and an inline transit
 * slot falls back to the internal house ad rather than collapsing. That only
 * works if the creative was picked up front, while the slot still resolved to
 * the `admob` tier — hence this predicate covering `admob` as well as
 * `internal`. `resolveAdSlotKind` itself is unchanged and covered by
 * `__tests__/lib/ad-waterfall.test.ts`.
 */
describe('needsInternalCreative', () => {
  it('selects a creative for an internal slot, which renders it directly', () => {
    assert.equal(needsInternalCreative('internal'), true);
  });

  it('selects a creative for an admob slot, held in reserve for no fill', () => {
    assert.equal(
      needsInternalCreative('admob'),
      true,
      'without a creative in hand, a no-fill native slot has nothing to fall back to',
    );
  });

  it('selects nothing for a first-party slot, which renders the API image', () => {
    assert.equal(needsInternalCreative('first-party'), false);
  });

  it('selects nothing when the slot resolves to no ad at all', () => {
    assert.equal(needsInternalCreative(null), false);
  });
});
