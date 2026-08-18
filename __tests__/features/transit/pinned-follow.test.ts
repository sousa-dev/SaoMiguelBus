/**
 * "Seguir viagem" — following a pinned itinerary, and saying where the bus is.
 *
 * Two things were broken and both are defended here.
 *
 *  1. The premium follow action only re-ran the search. It cannot track from what
 *     a pin stores — `resolvePinnedRoutes` drops every `legs[].tripId` at cutover
 *     on purpose, and the ids roll overnight anyway — so it has to find the pinned
 *     run in a fresh search. "The pinned run" is strict: a pin is *the 09h15*, and
 *     handing the rider the 11h15 because the 09h15 has gone would start a
 *     countdown against a bus they are not on.
 *  2. Nothing rendered the position. `computeJourneyStatus` has always known which
 *     stop the bus is at and which is next; the widget showed "En route · 24 min".
 *
 * The cases that carry weight are the ones where the honest answer is "not now":
 * already finished today, and does not run today at all. Both must name the next
 * departure rather than silently tracking the wrong bus.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  DEPARTURE_TOLERANCE_MIN,
  FOLLOW_HORIZON_DAYS,
  findPinnedJourney,
  matchesPin,
  nextServiceDays,
  resolvePinnedFollow,
  type FollowDay,
} from '@/features/transit/lib/pinned-follow';
import { journeyAsActiveTrack, journeyAsPinnedRoute } from '@/features/transit/lib/journey-legs';
import { computeJourneyStatus, journeyPositionLabels } from '@/lib/bus-tracking';
import type { PinnedRoute } from '@/lib/profile-store';
import { displayRouteNumber } from '@/lib/transit-format';
import type { TransitJourney, TransitJourneyLeg, TransitRideLeg } from '@/lib/types';

/** Wednesday 2 September 2026. */
const TODAY = '2026-09-02';
const TOMORROW = '2026-09-03';

/** Local instant on the search date, so the tests do not depend on the TZ. */
function at(hours: number, minutes: number, dayOffset = 0): Date {
  return new Date(2026, 8, 2 + dayOffset, hours, minutes, 0, 0);
}

function ride(route: string, tripId: number, stops: [string, string][]): TransitRideLeg {
  const list = stops.map(([name, time]) => ({ name, time }));
  const first = list[0];
  const last = list[list.length - 1];
  return {
    kind: 'ride',
    tripId,
    route,
    likesPercent: 0,
    dislikesPercent: 0,
    information: {},
    board: { name: first.name, time: first.time, sequence: 1, dayOffset: 0 },
    alight: { name: last.name, time: last.time, sequence: list.length, dayOffset: 0 },
    stops: list,
  };
}

function journeyOf(id: string, legs: TransitJourneyLeg[]): TransitJourney {
  const rides = legs.filter((leg): leg is TransitRideLeg => leg.kind === 'ride');
  return {
    id,
    transfers: rides.length - 1,
    start: rides[0].board.time,
    end: rides[rides.length - 1].alight.time,
    durationMinutes: 0,
    waitMinutes: 0,
    dayOffset: 0,
    typeOfDay: 'weekday',
    legs,
  };
}

/** The 110, Ponta Delgada → Lagoa, leaving at the given hour. */
function directJourney(departure: string, arrival: string, id = 'j1'): TransitJourney {
  return journeyOf(id, [
    ride('110', 1, [
      ['Ponta Delgada', departure],
      ['São Roque', addMinutes(departure, 9)],
      ['Lagoa', arrival],
    ]),
  ]);
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.replace('h', ':').split(':').map((x) => parseInt(x, 10));
  const total = (h * 60 + m + minutes + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}h${String(total % 60).padStart(2, '0')}`;
}

/** 110 to Lagoa, change, 205 on to Vila Franca. */
function twoBusJourney(tight = false): TransitJourney {
  return journeyOf('1:2', [
    ride('110', 1, [
      ['Ponta Delgada', '09h15'],
      ['São Roque', '09h24'],
      ['Lagoa', '09h34'],
    ]),
    {
      kind: 'transfer',
      at: 'Lagoa',
      from: 'Lagoa',
      waitMinutes: 14,
      walkMinutes: 0,
      slackMinutes: tight ? 3 : 14,
      tight,
      fromRoute: '110',
      toRoute: '205',
    },
    ride('205', 2, [
      ['Lagoa', '09h48'],
      ['Água de Pau', '10h02'],
      ['Vila Franca', '10h21'],
    ]),
  ]);
}

/** A pin built the way the app builds one, so the fixtures cannot drift. */
function pinOf(journey: TransitJourney): PinnedRoute {
  return {
    ...journeyAsPinnedRoute(journey, 'weekday', null, displayRouteNumber),
    id: 'pin-1',
    pinnedAt: at(8, 0).getTime(),
  };
}

/** The same pin after cutover, which strips every trip id. */
function withoutTripIds(pin: PinnedRoute): PinnedRoute {
  return { ...pin, tripId: undefined, legs: pin.legs.map(({ tripId: _drop, ...leg }) => leg) };
}

function day(date: string, journeys: TransitJourney[]): FollowDay {
  return { date, dayType: 'weekday', journeys };
}

describe('nextServiceDays — which service runs on each day ahead', () => {
  it('starts on today and covers a whole week, so every day type is reachable', () => {
    const days = nextServiceDays(at(9, 0));
    assert.equal(days.length, FOLLOW_HORIZON_DAYS);
    assert.equal(days[0].date, TODAY);
    assert.equal(days[1].date, TOMORROW);
    assert.deepEqual(
      new Set(days.map((d) => d.dayType)),
      new Set(['weekday', 'saturday', 'sunday']),
    );
  });

  it('reads the LOCAL date late in the evening, not the UTC one', () => {
    // At 23h30 in the Azores `toISOString()` already says tomorrow, which would
    // skip today's remaining departures entirely.
    assert.equal(nextServiceDays(at(23, 30))[0].date, TODAY);
  });

  it('treats a holiday as Sunday service', () => {
    const days = nextServiceDays(at(9, 0), [{ date: TODAY }]);
    assert.equal(days[0].dayType, 'sunday');
    assert.equal(days[1].dayType, 'weekday', 'only the holiday itself moves');
  });
});

describe('matching — a pin is a specific run, not a route pair', () => {
  const pin = pinOf(directJourney('09h15', '09h34'));

  it('picks the pinned departure out of a whole day of the same route', () => {
    const journeys = [
      directJourney('07h15', '07h34', 'a'),
      directJourney('09h15', '09h34', 'b'),
      directJourney('11h15', '11h34', 'c'),
    ];
    assert.equal(findPinnedJourney(journeys, pin)?.id, 'b');
  });

  it('rejects a different departure of the same route', () => {
    assert.equal(matchesPin(directJourney('11h15', '11h34'), pin), false);
  });

  it('absorbs a timetable edit of a minute or two, but nothing wider', () => {
    assert.equal(matchesPin(directJourney('09h17', '09h36'), pin), true);
    assert.equal(
      matchesPin(directJourney(addMinutes('09h15', DEPARTURE_TOLERANCE_MIN + 1), '09h40'), pin),
      false,
    );
  });

  it('matches on the route sequence in ORDER, not as a set', () => {
    const reversed = journeyOf('r', [
      ride('205', 9, [
        ['Ponta Delgada', '09h15'],
        ['Lagoa', '09h34'],
      ]),
      {
        kind: 'transfer',
        at: 'Lagoa',
        from: 'Lagoa',
        waitMinutes: 14,
        walkMinutes: 0,
        slackMinutes: 14,
        tight: false,
        fromRoute: '205',
        toRoute: '110',
      },
      ride('110', 8, [
        ['Lagoa', '09h48'],
        ['Vila Franca', '10h21'],
      ]),
    ]);
    assert.equal(matchesPin(reversed, pinOf(twoBusJourney())), false);
  });

  it('still matches a legacy pin whose route kept the unconfirmed C prefix', () => {
    const legacy: PinnedRoute = {
      ...pin,
      legs: pin.legs.map((leg) => ({ ...leg, routeNumber: `C${leg.routeNumber}` })),
    };
    assert.equal(matchesPin(directJourney('09h15', '09h34'), legacy), true);
  });

  it('matches without any trip id — the cutover migration drops them', () => {
    const stripped = withoutTripIds(pin);
    assert.equal(stripped.legs[0].tripId, undefined);
    assert.equal(matchesPin(directJourney('09h15', '09h34'), stripped), true);
  });
});

describe('resolvePinnedFollow — what tapping the button should do', () => {
  it('tracks a pin whose itinerary is running right now', () => {
    const pin = withoutTripIds(pinOf(directJourney('09h15', '09h34')));
    const today = directJourney('09h15', '09h34', 'today');
    const outcome = resolvePinnedFollow(pin, [day(TODAY, [today])], at(9, 26));

    assert.equal(outcome.status, 'track');
    assert.equal(outcome.status === 'track' && outcome.journey.id, 'today');

    // And the track it starts knows where the bus is.
    const track = journeyAsActiveTrack(today, 'weekday', null, displayRouteNumber, TODAY);
    const status = computeJourneyStatus(track, at(9, 26));
    assert.equal(status.phase, 'riding');
    assert.equal(status.currentStop?.name, 'São Roque');
    assert.equal(status.nextStop?.name, 'Lagoa');
    assert.equal(status.timeToNextStopMin, 8);
  });

  it('tracks a pin that has not left yet — the countdown IS the answer', () => {
    const pin = pinOf(directJourney('09h15', '09h34'));
    const outcome = resolvePinnedFollow(
      pin,
      [day(TODAY, [directJourney('09h15', '09h34', 'today')])],
      at(8, 50),
    );
    assert.equal(outcome.status, 'track');

    const track = journeyAsActiveTrack(
      directJourney('09h15', '09h34'),
      'weekday',
      null,
      displayRouteNumber,
      TODAY,
    );
    assert.equal(computeJourneyStatus(track, at(8, 50)).phase, 'waiting');
  });

  it('does not track a pin that has already finished today — it names the next one', () => {
    const pin = withoutTripIds(pinOf(directJourney('09h15', '09h34')));
    const outcome = resolvePinnedFollow(
      pin,
      [
        day(TODAY, [directJourney('09h15', '09h34', 'today')]),
        day(TOMORROW, [directJourney('09h15', '09h34', 'tomorrow')]),
      ],
      at(18, 0),
    );

    assert.equal(outcome.status, 'later');
    assert.equal(outcome.status === 'later' && outcome.date, TOMORROW);
    assert.equal(outcome.status === 'later' && outcome.time, '09h15');
  });

  it('reports nothing at all when a finished run does not come back in the horizon', () => {
    const pin = pinOf(directJourney('09h15', '09h34'));
    const outcome = resolvePinnedFollow(
      pin,
      [day(TODAY, [directJourney('09h15', '09h34', 'today')]), day(TOMORROW, [])],
      at(18, 0),
    );
    assert.equal(outcome.status, 'none');
  });

  it('does not track a pin that does not run today at all', () => {
    const pin = pinOf(directJourney('09h15', '09h34'));
    const outcome = resolvePinnedFollow(
      pin,
      [
        // Sunday service carries the 110, but never at 09h15.
        day(TODAY, [directJourney('11h15', '11h34', 'today-late')]),
        day(TOMORROW, [directJourney('09h15', '09h34', 'tomorrow')]),
      ],
      at(8, 0),
    );

    assert.equal(outcome.status, 'later');
    assert.equal(outcome.status === 'later' && outcome.date, TOMORROW);
  });

  it('reports none when the route pair has vanished from the whole horizon', () => {
    const pin = pinOf(directJourney('09h15', '09h34'));
    const outcome = resolvePinnedFollow(pin, [day(TODAY, []), day(TOMORROW, [])], at(8, 0));
    assert.equal(outcome.status, 'none');
  });

  it('tracks a multi-leg pin caught mid-transfer, and names the change', () => {
    const journey = twoBusJourney(true);
    const pin = withoutTripIds(pinOf(journey));
    // 09h40 — off the 110 at 09h34, the 205 does not leave until 09h48.
    const outcome = resolvePinnedFollow(pin, [day(TODAY, [journey])], at(9, 40));
    assert.equal(outcome.status, 'track');

    const track = journeyAsActiveTrack(journey, 'weekday', null, displayRouteNumber, TODAY);
    const status = computeJourneyStatus(track, at(9, 40));
    assert.equal(status.phase, 'transferring');
    assert.equal(status.legIndex, 1, 'the leg they are about to board');
    assert.equal(status.transfer?.at, 'Lagoa');
    assert.equal(status.timeToNextStopMin, 8);
  });
});

describe('journeyPositionLabels — where is it, in each phase', () => {
  const direct = journeyAsActiveTrack(
    directJourney('09h15', '09h34'),
    'weekday',
    null,
    displayRouteNumber,
    TODAY,
  );

  it('names the boarding stop and the wait while waiting', () => {
    const labels = journeyPositionLabels(computeJourneyStatus(direct, at(8, 50)));
    assert.deepEqual(labels.primary, {
      key: 'trackPositionBoardsAt',
      params: { stop: 'Ponta Delgada' },
    });
    assert.deepEqual(labels.secondary, {
      key: 'trackPositionDepartsIn',
      params: { minutes: 25 },
    });
  });

  it('names the stop behind and the stop ahead while riding', () => {
    const labels = journeyPositionLabels(computeJourneyStatus(direct, at(9, 26)));
    assert.deepEqual(labels.primary, {
      key: 'trackPositionPassed',
      params: { stop: 'São Roque' },
    });
    assert.deepEqual(labels.secondary, {
      key: 'trackPositionNextStop',
      params: { stop: 'Lagoa', minutes: 8 },
    });
  });

  it('names the change and the bus being caught while transferring', () => {
    const track = journeyAsActiveTrack(
      twoBusJourney(false),
      'weekday',
      null,
      displayRouteNumber,
      TODAY,
    );
    const labels = journeyPositionLabels(computeJourneyStatus(track, at(9, 40)));
    assert.deepEqual(labels.primary, {
      key: 'trackPositionChangeAt',
      params: { stop: 'Lagoa', route: '205' },
    });
    assert.deepEqual(labels.secondary, {
      key: 'trackPositionChangeIn',
      params: { minutes: 8 },
    });
  });

  it('calls out a tight change — the moment this widget earns its subscription', () => {
    const track = journeyAsActiveTrack(
      twoBusJourney(true),
      'weekday',
      null,
      displayRouteNumber,
      TODAY,
    );
    const labels = journeyPositionLabels(computeJourneyStatus(track, at(9, 40)));
    assert.equal(labels.secondary?.key, 'trackPositionChangeTightIn');
  });

  it('names the arrival stop once completed', () => {
    const labels = journeyPositionLabels(computeJourneyStatus(direct, at(12, 0)));
    assert.deepEqual(labels.primary, {
      key: 'trackPositionArrived',
      params: { stop: 'Lagoa' },
    });
    assert.equal(labels.secondary, null);
  });

  it('counts a past-midnight leg forwards, never backwards', () => {
    const nightJourney = journeyOf('night', [
      ride('110', 7, [
        ['Ponta Delgada', '23h40'],
        ['São Roque', '23h55'],
        ['Lagoa', '00h20'],
      ]),
    ]);
    const track = journeyAsActiveTrack(
      nightJourney,
      'weekday',
      null,
      displayRouteNumber,
      TODAY,
    );
    // 00h05 the NEXT calendar day — the old code read this as minute 5 of the
    // departure day and counted 23 hours the wrong way.
    const status = computeJourneyStatus(track, at(0, 5, 1));
    assert.equal(status.phase, 'riding');
    assert.equal(status.currentStop?.name, 'São Roque');
    const labels = journeyPositionLabels(status);
    assert.deepEqual(labels.secondary, {
      key: 'trackPositionNextStop',
      params: { stop: 'Lagoa', minutes: 15 },
    });
  });
});

describe('every position key is a real key in every locale', () => {
  /**
   * The parity test only sees literal `t('key')` calls, and these are emitted as
   * descriptors from `lib/bus-tracking.ts`, so nothing else would notice a typo
   * or a locale that missed one. A premium widget rendering `trackPositionPassed`
   * raw is exactly the bug 01 was written about.
   */
  const EMITTED = [
    'trackPositionBoardsAt',
    'trackPositionDepartsIn',
    'trackPositionPassed',
    'trackPositionNextStop',
    'trackPositionFinalStop',
    'trackPositionChangeAt',
    'trackPositionChangeIn',
    'trackPositionChangeTightIn',
    'trackPositionArrived',
    'trackPositionEstimated',
    // The defensive fallbacks the same function can return.
    'trackStatusTracking',
    'trackStatusEnRoute',
    'trackStatusTransferring',
    'trackStatusCompleted',
  ];

  const localesDir = join(process.cwd(), 'locales');
  const files = readdirSync(localesDir).filter((file) => file.endsWith('.json'));

  it('covers all eight catalogues', () => {
    assert.equal(files.length, 8);
  });

  for (const file of files) {
    it(`resolves in ${file}`, () => {
      const catalogue = JSON.parse(readFileSync(join(localesDir, file), 'utf8')) as Record<
        string,
        string
      >;
      const missing = EMITTED.filter((key) => !(key in catalogue));
      assert.deepEqual(missing, [], `locales/${file} is missing: ${missing.join(', ')}`);
    });
  }
});
