/**
 * Direct cover for the three helpers the notification planner reuses.
 *
 * They were module-private until the planner needed them and are exported for
 * that reason alone (notifications 04 §2.1) — no behaviour change. Until now
 * they were only ever exercised through `computeJourneyStatus`, so a
 * "simplification" of any of them could pass the existing suites while breaking
 * the alarm instants that now depend on them.
 *
 * Every instant here is built with `new Date(y, m, d, …)` — a LOCAL construction
 * — so the assertions hold in any timezone the CI box happens to be in. That is
 * also the property under test: `departureDayStart` parses its argument as a
 * local date, and the whole feature is wrong if anything upstream writes it in
 * UTC.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  departureDayStart,
  legSpans,
  localIsoDate,
  stopMinutes,
  withDayOffsets,
} from '@/lib/bus-tracking';
import type { TrackedLeg } from '@/lib/profile-store';

const MINUTES_PER_DAY = 1440;

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

describe('stopMinutes', () => {
  it('is wall-clock minutes when the stop is on the departure day', () => {
    assert.equal(stopMinutes({ name: 'Ponta Delgada', time: '08:30' }), 8 * 60 + 30);
  });

  it('adds a whole day per dayOffset — the line that keeps a past-midnight stop in the future', () => {
    assert.equal(
      stopMinutes({ name: 'Furnas', time: '00:10', dayOffset: 1 }),
      10 + MINUTES_PER_DAY,
    );
  });

  it('reads the API "HHhMM" spelling as well as "HH:MM"', () => {
    assert.equal(stopMinutes({ name: 'Ribeira Grande', time: '07h45' }), 7 * 60 + 45);
  });
});

describe('departureDayStart', () => {
  it('parses searchDate as a LOCAL date, not UTC', () => {
    assert.equal(departureDayStart('2026-09-02', new Date()), new Date(2026, 8, 2).getTime());
  });

  it('falls back to the local midnight of `now` when there is no searchDate', () => {
    const now = new Date(2026, 8, 2, 14, 37, 12);
    assert.equal(departureDayStart(undefined, now), new Date(2026, 8, 2).getTime());
  });

  it('falls back rather than producing NaN on a malformed searchDate', () => {
    const now = new Date(2026, 8, 2, 14, 37, 12);
    assert.equal(departureDayStart('not-a-date', now), new Date(2026, 8, 2).getTime());
  });

  /**
   * The `toISOString()` trap, pinned down.
   *
   * At 23h30 on a UTC-1 winter evening `toISOString()` already reads TOMORROW.
   * A searchDate written that way, parsed back as a local date here, anchors the
   * whole itinerary to the wrong midnight — which is what once showed a 24-hour
   * countdown for a bus leaving in 15 minutes. `localIsoDate` and
   * `departureDayStart` must agree on the day for every hour of the day.
   */
  it('round-trips localIsoDate at 23h30 — the hour the UTC bug appeared', () => {
    const lateEvening = new Date(2026, 0, 15, 23, 30, 0);
    assert.equal(localIsoDate(lateEvening), '2026-01-15');
    assert.equal(
      departureDayStart(localIsoDate(lateEvening), lateEvening),
      new Date(2026, 0, 15).getTime(),
    );
  });

  it('round-trips localIsoDate at 00h30 too', () => {
    const justAfterMidnight = new Date(2026, 0, 15, 0, 30, 0);
    assert.equal(localIsoDate(justAfterMidnight), '2026-01-15');
    assert.equal(
      departureDayStart(localIsoDate(justAfterMidnight), justAfterMidnight),
      new Date(2026, 0, 15).getTime(),
    );
  });
});

describe('legSpans', () => {
  it('reports plain wall-clock minutes for a daytime leg', () => {
    const spans = legSpans([
      leg('25', [
        ['Ponta Delgada', '08:00'],
        ['Lagoa', '08:20'],
        ['Vila Franca', '08:45'],
      ]),
    ]);
    assert.equal(spans.length, 1);
    assert.equal(spans[0].start, 8 * 60);
    assert.equal(spans[0].end, 8 * 60 + 45);
  });

  it('carries a leg that crosses midnight onto day 1 instead of backwards', () => {
    const spans = legSpans([
      leg('N1', [
        ['Ponta Delgada', '23:50'],
        ['Lagoa', '00:10'],
      ]),
    ]);
    assert.equal(spans[0].start, 23 * 60 + 50);
    assert.equal(spans[0].end, 10 + MINUTES_PER_DAY);
    assert.ok(spans[0].end > spans[0].start, 'a leg must never appear to end before it starts');
  });

  /**
   * The case only the BOUNDARY between legs reveals: neither stop list wraps on
   * its own, so nothing inside either leg says "next day". Without the cross-leg
   * carry the second bus lands 23 hours in the past.
   */
  it('carries the NEXT leg onto day 1 when the change itself spans midnight', () => {
    const spans = legSpans([
      leg('25', [
        ['Ponta Delgada', '23:30'],
        ['Lagoa', '23:55'],
      ]),
      leg('310', [
        ['Lagoa', '00:20'],
        ['Furnas', '01:05'],
      ]),
    ]);
    assert.equal(spans[0].end, 23 * 60 + 55);
    assert.equal(spans[1].start, 20 + MINUTES_PER_DAY);
    assert.equal(spans[1].end, 65 + MINUTES_PER_DAY);
    assert.ok(spans[1].start > spans[0].end, 'a leg cannot board before the previous one lands');
  });

  it('keeps the server’s travel order and never re-sorts on the clock', () => {
    const spans = legSpans([
      leg('N1', [
        ['Ponta Delgada', '23:40'],
        ['Lagoa', '23:55'],
        ['Vila Franca', '00:15'],
      ]),
    ]);
    assert.deepEqual(
      spans[0].stops.map((s) => s.name),
      ['Ponta Delgada', 'Lagoa', 'Vila Franca'],
    );
  });

  it('returns one span per leg for an ordinary two-leg journey', () => {
    const spans = legSpans([
      leg('25', [
        ['Ponta Delgada', '08:00'],
        ['Lagoa', '08:30'],
      ]),
      leg('310', [
        ['Lagoa', '08:45'],
        ['Furnas', '09:30'],
      ]),
    ]);
    assert.equal(spans.length, 2);
    assert.deepEqual(
      spans.map((s) => [s.start, s.end]),
      [
        [8 * 60, 8 * 60 + 30],
        [8 * 60 + 45, 9 * 60 + 30],
      ],
    );
  });
});
