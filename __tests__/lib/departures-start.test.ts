/**
 * "Próximas Partidas" used to send no `start`, so the API returned the whole
 * service day from its beginning and at 18:00 the list still opened with the
 * 06:15. This is the parameter that makes the heading true.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEPARTURES_START_BUCKET_MINUTES,
  departuresStartTime,
} from '@/lib/transit-format';

/** Local time — the timetable and the rider are both on the island. */
function at(hours: number, minutes: number) {
  return new Date(2026, 7, 15, hours, minutes, 30, 250);
}

describe('departuresStartTime', () => {
  it('emits the HHhMM shape the transit API takes', () => {
    assert.equal(departuresStartTime(at(8, 30)), '08h30');
  });

  it('zero-pads both halves, so 09:05 never becomes 9h5', () => {
    assert.equal(departuresStartTime(at(9, 5)), '09h05');
  });

  it('rounds DOWN, never up — rounding up would hide a bus still to come', () => {
    assert.equal(departuresStartTime(at(8, 34)), '08h30');
    assert.equal(departuresStartTime(at(8, 39)), '08h35');
  });

  it('is stable across a whole bucket, so the query key does not churn', () => {
    const window = [30, 31, 32, 33, 34].map((m) => departuresStartTime(at(8, m)));
    assert.deepEqual(new Set(window).size, 1, 'one key for the whole bucket');
  });

  it('leaves grace at the front: a bus 4 minutes gone is still listed', () => {
    // 08:34 asks the server from 08:30, so the 08:31 departure survives.
    assert.equal(departuresStartTime(at(8, 34)), '08h30');
    assert.ok(DEPARTURES_START_BUCKET_MINUTES >= 5);
  });

  it('does not roll the hour over at :55', () => {
    assert.equal(departuresStartTime(at(8, 59)), '08h55');
  });

  it('handles both ends of the day without wrapping', () => {
    assert.equal(departuresStartTime(at(0, 0)), '00h00');
    assert.equal(departuresStartTime(at(23, 59)), '23h55');
  });

  it('ignores seconds and milliseconds', () => {
    const noisy = new Date(2026, 7, 15, 8, 30, 59, 999);
    assert.equal(departuresStartTime(noisy), '08h30');
  });

  it('accepts a custom bucket and never divides by zero', () => {
    assert.equal(departuresStartTime(at(8, 47), 15), '08h45');
    assert.equal(departuresStartTime(at(8, 47), 1), '08h47');
    assert.equal(departuresStartTime(at(8, 47), 0), '08h47', 'clamped to 1, not NaN');
  });
});
