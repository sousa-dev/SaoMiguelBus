/**
 * The Android exact-alarm degradation rule (11 §A1.1).
 *
 * The finding behind this: `expo-notifications` checks the permission itself and
 * quietly falls back to an inexact alarm, so nothing crashes and nothing
 * complains — the notification is simply delivered up to half an hour late. The
 * asymmetry that drives the rule is that erring EARLY is recoverable (the rider
 * leaves a little sooner) and erring LATE is not (the bus has gone, or the rider
 * is two villages past their stop).
 *
 * So: keep the two lead-time alarms and bias them early; disable the two
 * position alarms outright, because a late "get off now" is worse than silence.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { planJourneyAlarms } from '@/lib/notifications/plan';
import {
  defaultNotificationPrefs,
  degradeForInexactAlarms,
  EXACT_ALARM_EARLY_BIAS_MIN,
  EXACT_ALARM_REQUIRED_TYPES,
} from '@/lib/notifications/types';
import { withDayOffsets } from '@/lib/bus-tracking';
import type { TrackedLeg } from '@/lib/profile-store';

function leg(route: string, stops: [string, string][]): TrackedLeg {
  const list = stops.map(([name, time]) => ({ name, time }));
  return {
    routeNumber: route,
    origin: list[0].name,
    destination: list[list.length - 1].name,
    start: list[0].time,
    end: list[list.length - 1].time,
    stops: withDayOffsets(list),
  };
}

const TWO_LEG = [
  leg('25', [
    ['Ponta Delgada', '08:00'],
    ['Lagoa', '08:30'],
  ]),
  leg('310', [
    ['Lagoa', '08:45'],
    ['Ribeira Quente', '09:10'],
    ['Furnas', '09:30'],
  ]),
];

describe('degradeForInexactAlarms', () => {
  it('disables exactly the two alarms that are harmful when late', () => {
    const degraded = degradeForInexactAlarms(
      (() => {
        const p = defaultNotificationPrefs();
        p.complete.enabled = true;
        return p;
      })(),
    );

    assert.equal(degraded.alight.enabled, false, 'a late "get off now" sends the rider elsewhere');
    assert.equal(degraded.complete.enabled, false, 'a late "you have arrived" is pure noise');
    assert.deepEqual(EXACT_ALARM_REQUIRED_TYPES, ['alight', 'complete']);
  });

  it('keeps the lead-time alarms, biased early enough to absorb the delay window', () => {
    const prefs = defaultNotificationPrefs();
    const degraded = degradeForInexactAlarms(prefs);

    assert.equal(degraded.leaveNow.enabled, true);
    assert.equal(degraded.change.enabled, true);
    assert.equal(degraded.leaveNow.leadMinutes, prefs.leaveNow.leadMinutes + EXACT_ALARM_EARLY_BIAS_MIN);
    assert.equal(degraded.change.leadMinutes, prefs.change.leadMinutes + EXACT_ALARM_EARLY_BIAS_MIN);
  });

  it('absorbs at least Android’s documented 10-minute inexact delay', () => {
    assert.ok(EXACT_ALARM_EARLY_BIAS_MIN >= 10);
  });

  it('respects a rider who had already switched a lead-time alarm off', () => {
    const prefs = defaultNotificationPrefs();
    prefs.change.enabled = false;
    assert.equal(degradeForInexactAlarms(prefs).change.enabled, false, 'degrading must not re-enable');
  });

  it('leaves the non-alarm preferences alone', () => {
    const prefs = defaultNotificationPrefs();
    prefs.notifyPinnedRoutes = true;
    const degraded = degradeForInexactAlarms(prefs);

    assert.equal(degraded.notifyPinnedRoutes, true);
    assert.equal(
      degraded.serviceAnnouncements,
      true,
      'the free channel has nothing to do with exact alarms',
    );
  });

  it('does not mutate the preferences it was given', () => {
    const prefs = defaultNotificationPrefs();
    degradeForInexactAlarms(prefs);
    assert.equal(prefs.alight.enabled, true, 'the rider’s stored choice is untouched');
    assert.equal(prefs.leaveNow.leadMinutes, 10);
  });
});

describe('degradeForInexactAlarms — what the planner then produces', () => {
  const track = { legs: TWO_LEG, transfers: [], searchDate: '2026-09-02' };
  const clock = new Date(2026, 8, 2, 6, 0, 0, 0);

  it('yields only the two lead-time alarms', () => {
    const prefs = defaultNotificationPrefs();
    prefs.complete.enabled = true;

    const precise = planJourneyAlarms(track, prefs, clock);
    const inexact = planJourneyAlarms(track, degradeForInexactAlarms(prefs), clock);

    assert.deepEqual(precise.map((a) => a.type), ['leaveNow', 'change', 'alight', 'complete']);
    assert.deepEqual(inexact.map((a) => a.type), ['leaveNow', 'change']);
  });

  it('moves the surviving alarms exactly the bias earlier', () => {
    const prefs = defaultNotificationPrefs();
    const precise = planJourneyAlarms(track, prefs, clock);
    const inexact = planJourneyAlarms(track, degradeForInexactAlarms(prefs), clock);

    const leaveNowPrecise = precise.find((a) => a.type === 'leaveNow');
    const leaveNowInexact = inexact.find((a) => a.type === 'leaveNow');
    assert.ok(leaveNowPrecise && leaveNowInexact);
    assert.equal(
      leaveNowPrecise.at.getTime() - leaveNowInexact.at.getTime(),
      EXACT_ALARM_EARLY_BIAS_MIN * 60_000,
    );
  });

  /**
   * The confirmation copy has to say "around" rather than name a minute it
   * cannot hit (07 §6), and the params carry the biased lead — so the caption a
   * rider reads matches the instant actually handed to the OS, which is the
   * property 02 §5 wants: a wrong time visible now is a bug reported now.
   */
  it('reports the biased lead in the copy params, not the original', () => {
    const prefs = defaultNotificationPrefs();
    const inexact = planJourneyAlarms(track, degradeForInexactAlarms(prefs), clock);
    const leaveNow = inexact.find((a) => a.type === 'leaveNow');

    assert.equal(leaveNow?.params.minutes, 10 + EXACT_ALARM_EARLY_BIAS_MIN);
  });
});
