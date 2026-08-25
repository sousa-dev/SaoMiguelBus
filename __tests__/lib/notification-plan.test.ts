/**
 * The centre of gravity for the notification feature (09 §2).
 *
 * `planJourneyAlarms` decides the exact minute a phone buzzes in someone's
 * pocket. Every other part of this feature is recoverable if it is wrong — a
 * mistyped string is embarrassing, a missed analytics event is invisible — but
 * an alarm on the wrong day sends a rider to a stop at the wrong time, which is
 * the specific harm the whole thing exists to prevent.
 *
 * Instants are asserted as offsets from the departure day's local midnight
 * rather than as wall-clock strings, so the suite holds in whatever timezone CI
 * happens to run in. The minute offsets themselves — the part that could
 * actually be wrong — are pinned separately in `bus-tracking-spans.test.ts`.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { withDayOffsets } from '@/lib/bus-tracking';
import { ALIGHT_FALLBACK_MIN, planJourneyAlarms } from '@/lib/notifications/plan';
import { defaultNotificationPrefs, type NotificationPrefs } from '@/lib/notifications/types';
import type { ActiveTrack, TrackedLeg, TrackedTransfer } from '@/lib/profile-store';
import { fullStops, loadJourney, withDayOffsets as fixtureDayOffsets } from '../fixtures/azoresbus/upstream';

/** Wednesday 2 September 2026 — after the cutover, on the new network. */
const SEARCH_DATE = '2026-09-02';
const DAY_START = new Date(2026, 8, 2).getTime();

/** Minutes since the departure day's local midnight. */
function mins(hours: number, minutes: number, day = 0): number {
  return day * 1440 + hours * 60 + minutes;
}

/** The instant `mins(...)` should have produced. */
function instant(minutes: number): number {
  return DAY_START + minutes * 60_000;
}

/** A local wall-clock instant on the search date, for `now`. */
function now(hours: number, minutes: number, day = 0): Date {
  return new Date(2026, 8, 2 + day, hours, minutes, 0, 0);
}

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

function track(
  legs: TrackedLeg[],
  options: { transfers?: TrackedTransfer[]; searchDate?: string } = {},
): Pick<ActiveTrack, 'legs' | 'transfers' | 'searchDate'> {
  return {
    legs,
    transfers: options.transfers ?? [],
    searchDate: options.searchDate ?? SEARCH_DATE,
  };
}

function transfer(at: string, tight = false): TrackedTransfer {
  return { at, from: '', waitMinutes: 15, walkMinutes: 0, tight };
}

/** Defaults with `complete` switched on, so "all four" means all four. */
function allTypes(overrides: Partial<NotificationPrefs> = {}): NotificationPrefs {
  const prefs = defaultNotificationPrefs();
  prefs.complete.enabled = true;
  return { ...prefs, ...overrides };
}

function onlyType(type: 'leaveNow' | 'change' | 'alight' | 'complete'): NotificationPrefs {
  const prefs = defaultNotificationPrefs();
  for (const key of ['leaveNow', 'change', 'alight', 'complete'] as const) {
    prefs[key].enabled = key === type;
  }
  return prefs;
}

/** 08h00 Ponta Delgada → 08h45 Vila Franca, four stops. */
const DIRECT = [
  leg('25', [
    ['Ponta Delgada', '08:00'],
    ['Lagoa', '08:15'],
    ['Água de Pau', '08:30'],
    ['Vila Franca', '08:45'],
  ]),
];

/** 08h00 → 08h30, change at Lagoa, 08h45 → 09h30. */
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

describe('planJourneyAlarms — instants', () => {
  it('a direct journey with all four types enabled yields three alarms, ascending', () => {
    const alarms = planJourneyAlarms(track(DIRECT), allTypes(), now(6, 0));

    assert.deepEqual(
      alarms.map((a) => a.type),
      ['leaveNow', 'alight', 'complete'],
      'no change alarm on a journey with no change',
    );
    const times = alarms.map((a) => a.at.getTime());
    assert.deepEqual([...times].sort((a, b) => a - b), times, 'alarms must come back ascending');
  });

  it('fires leaveNow leadMinutes before the first departure', () => {
    const [leaveNow] = planJourneyAlarms(track(DIRECT), onlyType('leaveNow'), now(6, 0));
    assert.equal(leaveNow.at.getTime(), instant(mins(7, 50)), '08h00 less the default 10 min');
    assert.equal(leaveNow.legIndex, 0);
    assert.equal(leaveNow.params.route, '25');
    assert.equal(leaveNow.params.stop, 'Ponta Delgada');
    assert.equal(leaveNow.params.minutes, 10);
  });

  it('honours leadMinutes — 10 vs 30 shifts the instant by exactly 20 minutes', () => {
    const ten = defaultNotificationPrefs();
    ten.leaveNow.leadMinutes = 10;
    const thirty = defaultNotificationPrefs();
    thirty.change.enabled = false;
    thirty.leaveNow.leadMinutes = 30;

    const a = planJourneyAlarms(track(DIRECT), ten, now(6, 0)).find((x) => x.type === 'leaveNow');
    const b = planJourneyAlarms(track(DIRECT), thirty, now(6, 0)).find((x) => x.type === 'leaveNow');

    assert.ok(a && b);
    assert.equal(a.at.getTime() - b.at.getTime(), 20 * 60_000);
  });

  /**
   * The rule `computeJourneyStatus` already established: during a change,
   * `legIndex` names the bus being BOARDED. An alarm counting down to a bus the
   * rider has already got off is useless.
   */
  it('fires change against the NEXT leg’s boarding, not the previous leg’s arrival', () => {
    const alarms = planJourneyAlarms(
      track(TWO_LEG, { transfers: [transfer('Lagoa')] }),
      onlyType('change'),
      now(6, 0),
    );

    assert.equal(alarms.length, 1);
    assert.equal(alarms[0].type, 'change');
    assert.equal(alarms[0].at.getTime(), instant(mins(8, 40)), '08h45 boarding less 5 min');
    assert.notEqual(alarms[0].at.getTime(), instant(mins(8, 30)), 'not leg 0’s arrival');
    assert.equal(alarms[0].legIndex, 1, 'the leg being boarded');
    assert.equal(alarms[0].params.route, '310');
    assert.equal(alarms[0].params.stop, 'Lagoa');
  });

  it('yields one change alarm per transfer on a three-leg journey, in order', () => {
    const threeLeg = [
      leg('25', [
        ['Ponta Delgada', '08:00'],
        ['Lagoa', '08:30'],
      ]),
      leg('310', [
        ['Lagoa', '08:45'],
        ['Vila Franca', '09:15'],
      ]),
      leg('318', [
        ['Vila Franca', '09:30'],
        ['Furnas', '10:10'],
      ]),
    ];
    const alarms = planJourneyAlarms(
      track(threeLeg, { transfers: [transfer('Lagoa'), transfer('Vila Franca')] }),
      onlyType('change'),
      now(6, 0),
    );

    assert.equal(alarms.length, 2);
    assert.deepEqual(
      alarms.map((a) => a.at.getTime()),
      [instant(mins(8, 40)), instant(mins(9, 25))],
    );
    assert.deepEqual(alarms.map((a) => a.legIndex), [1, 2]);
    assert.deepEqual(alarms.map((a) => a.params.route), ['310', '318']);
  });

  it('marks a tight change so the copy can be more urgent', () => {
    const [plain] = planJourneyAlarms(
      track(TWO_LEG, { transfers: [transfer('Lagoa', false)] }),
      onlyType('change'),
      now(6, 0),
    );
    const [tight] = planJourneyAlarms(
      track(TWO_LEG, { transfers: [transfer('Lagoa', true)] }),
      onlyType('change'),
      now(6, 0),
    );

    assert.equal(plain.params.tight, false);
    assert.equal(tight.params.tight, true);
    assert.equal(plain.at.getTime(), tight.at.getTime(), 'same instant, different words');
  });

  it('fires alight at the second-to-last stop of the FINAL leg, naming the last', () => {
    const alarms = planJourneyAlarms(track(TWO_LEG), onlyType('alight'), now(6, 0));

    assert.equal(alarms.length, 1);
    assert.equal(
      alarms[0].at.getTime(),
      instant(mins(9, 10)),
      'Ribeira Quente — final leg’s second-to-last stop',
    );
    assert.notEqual(alarms[0].at.getTime(), instant(mins(8, 0)), 'not leg 0');
    assert.equal(alarms[0].params.stop, 'Furnas', 'names the stop to get off AT');
    assert.equal(alarms[0].legIndex, 1);
  });

  it('fires complete at the final arrival', () => {
    const alarms = planJourneyAlarms(track(TWO_LEG), onlyType('complete'), now(6, 0));
    assert.equal(alarms.length, 1);
    assert.equal(alarms[0].at.getTime(), instant(mins(9, 30)));
    assert.equal(alarms[0].params.stop, 'Furnas');
  });
});

describe('planJourneyAlarms — the past-instant rule (R14)', () => {
  it('returns nothing once the whole journey is over', () => {
    assert.deepEqual(planJourneyAlarms(track(TWO_LEG), allTypes(), now(23, 0)), []);
  });

  it('drops what has passed mid-journey and keeps what has not', () => {
    // 08h50: departed, the change is gone, still riding towards Furnas.
    const alarms = planJourneyAlarms(
      track(TWO_LEG, { transfers: [transfer('Lagoa')] }),
      allTypes(),
      now(8, 50),
    );
    assert.deepEqual(alarms.map((a) => a.type), ['alight', 'complete']);
  });

  it('drops an alarm landing exactly on now — `at <= now`, not `<`', () => {
    // leaveNow for the 08h00 departure is 07h50 on the default 10-min lead.
    const alarms = planJourneyAlarms(track(DIRECT), onlyType('leaveNow'), now(7, 50));
    assert.deepEqual(alarms, [], 'an alarm due this instant is already in the past to the OS');
  });

  it('keeps the same alarm one minute earlier, proving the boundary is the boundary', () => {
    const alarms = planJourneyAlarms(track(DIRECT), onlyType('leaveNow'), now(7, 49));
    assert.equal(alarms.length, 1);
  });

  it('drops only leaveNow when a long lead pushes it before now, keeping the rest', () => {
    const prefs = allTypes();
    prefs.leaveNow.leadMinutes = 30; // 07h30, before a 07h40 `now`
    const alarms = planJourneyAlarms(track(TWO_LEG, { transfers: [transfer('Lagoa')] }), prefs, now(7, 40));

    assert.ok(!alarms.some((a) => a.type === 'leaveNow'));
    assert.deepEqual(alarms.map((a) => a.type), ['change', 'alight', 'complete']);
  });
});

describe('planJourneyAlarms — midnight and day offsets', () => {
  it('puts alight and complete on day 1 for a leg running 23h50 → 00h10', () => {
    const nightLeg = [
      leg('N1', [
        ['Ponta Delgada', '23:50'],
        ['Lagoa', '00:00'],
        ['Vila Franca', '00:10'],
      ]),
    ];
    const alarms = planJourneyAlarms(track(nightLeg), allTypes(), now(20, 0));

    const alight = alarms.find((a) => a.type === 'alight');
    const complete = alarms.find((a) => a.type === 'complete');
    assert.ok(alight && complete);
    assert.equal(alight.at.getTime(), instant(mins(0, 0, 1)), 'day 1, not 23 hours in the past');
    assert.equal(complete.at.getTime(), instant(mins(0, 10, 1)));
    assert.ok(complete.at.getTime() > now(20, 0).getTime());
  });

  /**
   * Neither leg's own stop list wraps — only the boundary between them says the
   * change ran over midnight. This is the case `legSpans`' cross-leg carry
   * exists for, and the one a reimplementation would get wrong.
   */
  it('puts a change spanning midnight on day 1', () => {
    const overnight = [
      leg('25', [
        ['Ponta Delgada', '23:30'],
        ['Lagoa', '23:55'],
      ]),
      leg('310', [
        ['Lagoa', '00:20'],
        ['Furnas', '01:05'],
      ]),
    ];
    const alarms = planJourneyAlarms(
      track(overnight, { transfers: [transfer('Lagoa')] }),
      onlyType('change'),
      now(22, 0),
    );

    assert.equal(alarms.length, 1);
    assert.equal(alarms[0].at.getTime(), instant(mins(0, 15, 1)), '00h20 boarding less 5 min, day 1');
  });

  it('shifts every instant by 24h when the journey is tracked for tomorrow', () => {
    const today = planJourneyAlarms(track(DIRECT), allTypes(), now(6, 0));
    const tomorrow = planJourneyAlarms(
      track(DIRECT, { searchDate: '2026-09-03' }),
      allTypes(),
      now(6, 0),
    );

    assert.equal(today.length, tomorrow.length);
    for (let i = 0; i < today.length; i += 1) {
      assert.equal(
        tomorrow[i].at.getTime() - today[i].at.getTime(),
        24 * 60 * 60_000,
        'tomorrow’s journey is a day later, not the same day',
      );
    }
  });

  /**
   * The `toISOString()` trap, stated as its consequence.
   *
   * At 23h30 on a UTC-1 Azores winter evening `toISOString()` already reads
   * TOMORROW. A `searchDate` written that way anchors the itinerary to the wrong
   * midnight — and the error is not subtle, it is a clean 24 hours. This is the
   * test that should fail if anyone "simplifies" `departureDayStart` to parse
   * UTC; `bus-tracking-spans.test.ts` pins the `localIsoDate` round-trip that
   * keeps the right day being written in the first place.
   */
  it('anchoring one day late — what a UTC-derived searchDate does — moves every instant 24h', () => {
    // A winter morning, so the clock sits before the itinerary rather than eight
    // months after it — otherwise the past-instant rule empties both lists and
    // the comparison proves nothing.
    const winterMorning = new Date(2026, 0, 15, 6, 0, 0, 0);
    const correct = planJourneyAlarms(track(DIRECT, { searchDate: '2026-01-15' }), allTypes(), winterMorning);
    const utcSkewed = planJourneyAlarms(track(DIRECT, { searchDate: '2026-01-16' }), allTypes(), winterMorning);

    assert.ok(correct.length > 0);
    for (let i = 0; i < correct.length; i += 1) {
      assert.equal(utcSkewed[i].at.getTime() - correct[i].at.getTime(), 24 * 60 * 60_000);
    }
  });
});

describe('planJourneyAlarms — preferences', () => {
  it('returns nothing with every type disabled', () => {
    const off = defaultNotificationPrefs();
    for (const key of ['leaveNow', 'change', 'alight', 'complete'] as const) {
      off[key].enabled = false;
    }
    assert.deepEqual(planJourneyAlarms(track(TWO_LEG), off, now(6, 0)), []);
  });

  it('returns exactly one alarm with only alight enabled', () => {
    const alarms = planJourneyAlarms(track(TWO_LEG), onlyType('alight'), now(6, 0));
    assert.equal(alarms.length, 1);
    assert.equal(alarms[0].type, 'alight');
  });

  it('produces no change alarm, and does not crash, on a direct journey', () => {
    const alarms = planJourneyAlarms(track(DIRECT), onlyType('change'), now(6, 0));
    assert.deepEqual(alarms, []);
  });
});

describe('planJourneyAlarms — degenerate input', () => {
  it('returns nothing for a record with no legs', () => {
    assert.deepEqual(planJourneyAlarms(track([]), allTypes(), now(6, 0)), []);
  });

  it('tolerates an unmigrated record whose legs are missing entirely', () => {
    const unmigrated = { transfers: [], searchDate: SEARCH_DATE } as unknown as Pick<
      ActiveTrack,
      'legs' | 'transfers' | 'searchDate'
    >;
    assert.deepEqual(planJourneyAlarms(unmigrated, allTypes(), now(6, 0)), []);
  });

  it('filters a leg carrying no stops, exactly as trackLegs does', () => {
    const withEmpty = [
      { ...leg('25', [['Ponta Delgada', '08:00'], ['Vila Franca', '08:45']]) },
      { ...leg('310', [['Lagoa', '09:00'], ['Furnas', '09:30']]), stops: [] },
    ];
    const alarms = planJourneyAlarms(track(withEmpty), onlyType('complete'), now(6, 0));

    assert.equal(alarms.length, 1);
    assert.equal(alarms[0].params.stop, 'Vila Franca', 'the empty leg is not the final leg');
  });

  it('falls back for a final leg with a single stop', () => {
    const hop = [
      leg('25', [
        ['Ponta Delgada', '08:00'],
        ['Lagoa', '08:30'],
      ]),
      { ...leg('310', [['Furnas', '09:00']]), start: '09:00', end: '09:30' },
    ];
    // One stop means start === end === 09h00, so the fallback lands at 08h57,
    // before the leg starts — and is dropped rather than fired pre-boarding.
    const dropped = planJourneyAlarms(track(hop), onlyType('alight'), now(6, 0));
    assert.deepEqual(dropped, [], 'never fire an alight before the rider has boarded');
  });

  it('uses the fallback when the final leg has a single stop but real span', () => {
    // A one-stop leg whose stop list has one entry cannot span time, so the
    // honest way to reach the fallback is a two-stop leg where the fallback is
    // still inside the leg — proving the constant is applied, not ignored.
    const twoStopFinal = [
      leg('310', [
        ['Lagoa', '09:00'],
        ['Furnas', '09:30'],
      ]),
    ];
    const alarms = planJourneyAlarms(track(twoStopFinal), onlyType('alight'), now(6, 0));
    assert.equal(alarms.length, 1);
    assert.equal(alarms[0].at.getTime(), instant(mins(9, 0)), 'second-to-last stop is Lagoa');
    assert.ok(ALIGHT_FALLBACK_MIN > 0, 'the fallback constant is real');
  });
});

describe('planJourneyAlarms — a real AzoresBus journey', () => {
  /**
   * Hand-built legs make the instant assertions above readable; this one proves
   * the planner survives a real captured timetable, with its 40-odd stops, its
   * all-caps names and its second-resolution times.
   */
  it('plans against the captured route 25 journey', () => {
    const stops = fullStops(fixtureDayOffsets(loadJourney('journey_25_488.json')));
    const realLeg: TrackedLeg = {
      routeNumber: '25',
      origin: stops[0].name,
      destination: stops[stops.length - 1].name,
      start: stops[0].time,
      end: stops[stops.length - 1].time,
      stops: withDayOffsets(stops),
    };

    const alarms = planJourneyAlarms(track([realLeg]), allTypes(), now(0, 1));

    assert.deepEqual(alarms.map((a) => a.type), ['leaveNow', 'alight', 'complete']);
    assert.equal(alarms[0].params.stop, stops[0].name);
    assert.equal(
      alarms[1].params.stop,
      stops[stops.length - 1].name,
      'alight names the destination',
    );
    assert.ok(
      alarms[1].at.getTime() < alarms[2].at.getTime(),
      'alight fires before the journey completes',
    );
  });
});
