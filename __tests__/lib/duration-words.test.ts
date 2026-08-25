/**
 * Wait times as words.
 *
 * A transfer wait was rendered as a raw minute count, so a 77-minute
 * connection read "77 min wait" — a number a rider has to divide in their head
 * to find out whether they can leave the stop.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatDurationWords } from '@/lib/transit-format';

/**
 * Stands in for i18next: resolves the `_one`/`_other` suffix from `count` and
 * interpolates, so these tests exercise the real key contract rather than a
 * reimplementation of the formatting.
 */
const EN: Record<string, string> = {
  durationHours_one: '{{count}} hour',
  durationHours_other: '{{count}} hours',
  durationMinutes_one: '{{count}} minute',
  durationMinutes_other: '{{count}} minutes',
  durationHoursAndMinutes: '{{hours}} and {{minutes}}',
};

function t(key: string, options: Record<string, unknown> = {}): string {
  const count = options.count as number | undefined;
  const resolved =
    count == null ? key : `${key}_${count === 1 ? 'one' : 'other'}`;
  const template = EN[resolved] ?? EN[key] ?? key;
  return template.replace(/\{\{(\w+)\}\}/g, (_, name) => String(options[name] ?? ''));
}

describe('formatDurationWords', () => {
  it('spells out the hour instead of leaving a raw minute count', () => {
    assert.equal(formatDurationWords(t, 77), '1 hour and 17 minutes');
  });

  it('leaves sub-hour waits as minutes alone', () => {
    assert.equal(formatDurationWords(t, 17), '17 minutes');
    assert.equal(formatDurationWords(t, 59), '59 minutes');
  });

  it('drops the minutes part on a whole hour', () => {
    assert.equal(formatDurationWords(t, 60), '1 hour');
    assert.equal(formatDurationWords(t, 120), '2 hours');
  });

  it('pluralises each unit independently', () => {
    // The reason the phrase is built from two keys instead of one template.
    assert.equal(formatDurationWords(t, 61), '1 hour and 1 minute');
    assert.equal(formatDurationWords(t, 121), '2 hours and 1 minute');
    assert.equal(formatDurationWords(t, 62), '1 hour and 2 minutes');
  });

  it('handles zero and never emits a negative duration', () => {
    assert.equal(formatDurationWords(t, 0), '0 minutes');
    assert.equal(formatDurationWords(t, -5), '0 minutes');
  });

  it('rounds fractional minutes rather than printing a decimal', () => {
    assert.equal(formatDurationWords(t, 77.4), '1 hour and 17 minutes');
  });
});
