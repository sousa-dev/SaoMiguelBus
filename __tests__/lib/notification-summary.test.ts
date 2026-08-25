/**
 * The armed-confirmation caption (02 §5).
 *
 * Its whole purpose is that a wrong instant becomes visible immediately, so the
 * cases worth pinning are the ones where the caption could quietly disagree with
 * what was actually scheduled: an alarm described by position rather than by a
 * clock, a delivery window the platform will not commit to, and a journey that
 * was already under way when the rider armed it.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PlannedAlarm } from '@/lib/notifications/plan';
import { summariseArmedAlarms } from '@/lib/notifications/summary';

function alarm(type: PlannedAlarm['type'], hours: number, minutes: number): PlannedAlarm {
  return {
    type,
    at: new Date(2026, 8, 2, hours, minutes, 0, 0),
    legIndex: 0,
    params: {},
  };
}

const PRECISE = { precise: true, skippedPast: 0 };

describe('summariseArmedAlarms', () => {
  it('returns nothing when nothing was armed', () => {
    assert.equal(summariseArmedAlarms([], PRECISE), null);
  });

  it('lists clock times in HHhMM, the spelling the rest of the app uses', () => {
    const summary = summariseArmedAlarms(
      [alarm('leaveNow', 8, 22), alarm('change', 8, 47)],
      PRECISE,
    );
    assert.equal(summary?.timesKey, 'notificationsArmed');
    assert.equal(summary?.times, '08h22, 08h47');
    assert.equal(summary?.includesAlight, false);
  });

  it('describes alight by position rather than folding it into the time list', () => {
    const summary = summariseArmedAlarms(
      [alarm('leaveNow', 8, 22), alarm('alight', 9, 10)],
      PRECISE,
    );
    assert.equal(summary?.times, '08h22', 'the alight instant is not a time the rider is told');
    assert.equal(summary?.includesAlight, true);
  });

  it('drops the times line entirely when only alight was armed', () => {
    const summary = summariseArmedAlarms([alarm('alight', 9, 10)], PRECISE);
    assert.equal(summary?.timesKey, null, 'never render "We’ll tell you at" with no times');
    assert.equal(summary?.includesAlight, true);
  });

  it('says "around" when the platform will not commit to the minute', () => {
    const summary = summariseArmedAlarms([alarm('leaveNow', 8, 22)], {
      precise: false,
      skippedPast: 0,
    });
    assert.equal(summary?.timesKey, 'notificationsArmedApprox');
  });

  it('flags that some alerts were skipped on an already-departed journey', () => {
    const summary = summariseArmedAlarms([alarm('alight', 9, 10)], {
      precise: true,
      skippedPast: 2,
    });
    assert.equal(summary?.someSkipped, true);
  });

  it('does not flag skipping when nothing was skipped', () => {
    assert.equal(summariseArmedAlarms([alarm('leaveNow', 8, 22)], PRECISE)?.someSkipped, false);
  });

  it('formats a past-midnight alarm as its local wall clock, not as 24h+', () => {
    const summary = summariseArmedAlarms([alarm('complete', 0, 15)], PRECISE);
    assert.equal(summary?.times, '00h15');
  });
});
