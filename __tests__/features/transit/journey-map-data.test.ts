/**
 * Journey map data.
 *
 * The rule these exist to protect: a leg with no road shape draws NO line. On
 * the legacy network a stop-to-stop line jumps 12.9 km from Vila Franca to
 * Furnas, straight through the caldera — a confident wrong line a rider would
 * believe. No shape, no line, no map.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CHANGE_COLOR,
  actionPins,
  buildJourneyMapData,
  groupJourneySteps,
  isMappable,
  journeyMapCoordinates,
  legColor,
} from '@/features/transit/lib/journey-map-data';
import { encodePolyline } from '@/lib/polyline';
import type { TransitJourney, TransitLegGeometry } from '@/lib/types';

const CAPELAS = { latitude: 37.828, longitude: -25.677 };
const HUB = { latitude: 37.74, longitude: -25.668 };
const FURNAS = { latitude: 37.772, longitude: -25.31 };

const rideLeg = (tripId: number, route: string) =>
  ({
    kind: 'ride' as const,
    tripId,
    route,
    likesPercent: 80,
    dislikesPercent: 20,
    information: {},
    board: { name: 'A', time: '08h00', sequence: 1, dayOffset: 0 },
    alight: { name: 'B', time: '09h00', sequence: 2, dayOffset: 0 },
    stops: [],
  });

const transferLeg = {
  kind: 'transfer' as const,
  at: 'PONTA DELGADA',
  from: 'PONTA DELGADA',
  waitMinutes: 35,
  walkMinutes: 0,
  slackMinutes: 35,
  tight: false,
  fromRoute: '315',
  toRoute: '110',
};

function journey(legs: TransitJourney['legs']): TransitJourney {
  return {
    id: '1:2',
    transfers: legs.filter((l) => l.kind === 'transfer').length,
    start: '08h00',
    end: '11h00',
    durationMinutes: 180,
    waitMinutes: 35,
    dayOffset: 0,
    legs,
  };
}

/**
 * A stable id per PLACE, as production has it: the same physical stop carries
 * the same `stopId` on every trip that serves it. Deriving it from the trip
 * would make an interchange look like two different stops and hide the
 * get-off/get-on dedupe this file tests.
 */
function stopIdFor(name: string): number {
  let hash = 0;
  for (const char of name) {
    hash = (hash * 31 + char.charCodeAt(0)) % 100000;
  }
  return hash + 1;
}

function geometry(
  tripId: number,
  route: string,
  stops: { name: string; coord?: { latitude: number; longitude: number } }[],
  shapePoints?: { latitude: number; longitude: number }[],
): TransitLegGeometry {
  return {
    tripId,
    route,
    shape: shapePoints ? encodePolyline(shapePoints) : '',
    stops: stops.map((s, i) => ({
      stopId: stopIdFor(s.name),
      name: s.name,
      time: `0${8 + i}h00`,
      sequence: i + 1,
      dayOffset: 0,
      ...(s.coord ? { lat: s.coord.latitude, lon: s.coord.longitude } : {}),
      code: `P0${i + 1}`,
    })),
  };
}

const TWO_LEG = journey([rideLeg(1, '315'), transferLeg, rideLeg(2, '110')]);

describe('buildJourneyMapData — the no-straight-lines rule', () => {
  it('draws no line for a leg with no shape', () => {
    const data = buildJourneyMapData(journey([rideLeg(1, '218')]), [
      geometry(1, '218', [
        { name: 'Vila Franca', coord: HUB },
        { name: 'Furnas', coord: FURNAS },
      ]),
    ]);

    assert.deepEqual(data.lines, []);
    assert.equal(data.hasShape, false);
    // The stops are still placed — we just refuse to invent the road between them.
    assert.equal(data.pins.length, 2);
  });

  it('draws the road when a shape is present', () => {
    const path = [CAPELAS, { latitude: 37.79, longitude: -25.67 }, HUB];
    const data = buildJourneyMapData(journey([rideLeg(1, '315')]), [
      geometry(1, '315', [
        { name: 'Capelas', coord: CAPELAS },
        { name: 'Ponta Delgada', coord: HUB },
      ], path),
    ]);

    assert.equal(data.lines.length, 1);
    assert.equal(data.hasShape, true);
    assert.equal(data.lines[0].coordinates.length, 3);
    assert.equal(data.lines[0].route, '315');
  });

  it('ignores a degenerate one-point shape', () => {
    const data = buildJourneyMapData(journey([rideLeg(1, '315')]), [
      geometry(1, '315', [{ name: 'Capelas', coord: CAPELAS }], [CAPELAS]),
    ]);

    assert.deepEqual(data.lines, []);
  });
});

describe('buildJourneyMapData — legs and pins', () => {
  const geoms = [
    geometry(1, '315', [
      { name: 'Capelas', coord: CAPELAS },
      { name: 'Ponta Delgada', coord: HUB },
    ], [CAPELAS, HUB]),
    geometry(2, '110', [
      { name: 'Ponta Delgada', coord: HUB },
      { name: 'Furnas', coord: FURNAS },
    ], [HUB, FURNAS]),
  ];

  it('gives each leg its own colour so two buses never look like one', () => {
    const data = buildJourneyMapData(TWO_LEG, geoms);

    assert.equal(data.lines.length, 2);
    assert.notEqual(data.lines[0].color, data.lines[1].color);
    assert.equal(data.lines[0].color, legColor(0));
  });

  it('marks board, change and alight — and only those', () => {
    const data = buildJourneyMapData(TWO_LEG, geoms);

    assert.deepEqual(
      actionPins(data).map((p) => p.kind),
      ['board', 'change', 'alight'],
    );
  });

  it('numbers the action pins in travel order', () => {
    const data = buildJourneyMapData(TWO_LEG, geoms);

    assert.deepEqual(actionPins(data).map((p) => p.step), [1, 2, 3]);
  });

  it('colours the change distinctly — it is the risky moment', () => {
    const data = buildJourneyMapData(TWO_LEG, geoms);
    const change = actionPins(data).find((p) => p.kind === 'change');

    assert.equal(change?.color, CHANGE_COLOR);
  });

  it('carries the pole code through for the stop sheet', () => {
    const data = buildJourneyMapData(TWO_LEG, geoms);

    assert.equal(data.pins[0].code, 'P01');
    assert.ok(data.pins[0].stopId > 0);
  });

  it('treats a single-bus journey as board then alight', () => {
    const data = buildJourneyMapData(journey([rideLeg(1, '315')]), [geoms[0]]);

    assert.deepEqual(actionPins(data).map((p) => p.kind), ['board', 'alight']);
  });
});

describe('buildJourneyMapData — missing data', () => {
  it('contributes nothing for a leg whose geometry has not arrived', () => {
    const data = buildJourneyMapData(TWO_LEG, [undefined, undefined]);

    assert.deepEqual(data.lines, []);
    assert.deepEqual(data.pins, []);
    assert.equal(isMappable(data), false);
  });

  it('drops stops with no coordinates rather than pinning Null Island', () => {
    const data = buildJourneyMapData(journey([rideLeg(1, '218')]), [
      geometry(1, '218', [
        { name: 'Placed', coord: HUB },
        { name: 'Unplaced' },
        { name: 'Zeroed', coord: { latitude: 0, longitude: 0 } },
      ]),
    ]);

    assert.deepEqual(data.pins.map((p) => p.name), ['Placed']);
  });

  it('is not mappable from a single lone pin', () => {
    const data = buildJourneyMapData(journey([rideLeg(1, '218')]), [
      geometry(1, '218', [{ name: 'Only', coord: HUB }]),
    ]);

    assert.equal(data.pins.length, 1);
    assert.equal(isMappable(data), false);
  });

  it('is mappable from two placed stops even without a road shape', () => {
    const data = buildJourneyMapData(journey([rideLeg(1, '218')]), [
      geometry(1, '218', [
        { name: 'One', coord: HUB },
        { name: 'Two', coord: FURNAS },
      ]),
    ]);

    assert.equal(isMappable(data), true);
  });
});

describe('journeyMapCoordinates', () => {
  it('includes both the path and the pins so nothing is framed out', () => {
    const data = buildJourneyMapData(journey([rideLeg(1, '315')]), [
      geometry(1, '315', [
        { name: 'Capelas', coord: CAPELAS },
        { name: 'Ponta Delgada', coord: HUB },
      ], [CAPELAS, { latitude: 37.79, longitude: -25.67 }, HUB]),
    ]);

    assert.equal(journeyMapCoordinates(data).length, 3 + 2);
  });
});

describe('groupJourneySteps — folding away the stops in between', () => {
  const geoms = [
    geometry(1, '219', [
      { name: 'Capelas', coord: CAPELAS },
      { name: 'Serra Gorda', coord: { latitude: 37.80, longitude: -25.67 } },
      { name: 'Fajã de Cima', coord: { latitude: 37.77, longitude: -25.67 } },
      { name: 'Ponta Delgada', coord: HUB },
    ], [CAPELAS, HUB]),
    geometry(2, '318', [
      { name: 'Ponta Delgada', coord: HUB },
      { name: 'Lagoa', coord: { latitude: 37.745, longitude: -25.58 } },
      { name: 'Furnas', coord: FURNAS },
    ], [HUB, FURNAS]),
  ];
  const data = buildJourneyMapData(TWO_LEG, geoms);
  const groups = groupJourneySteps(data.pins);

  it('keeps the decisions as their own rows', () => {
    assert.deepEqual(
      groups.filter((g) => g.kind === 'action').map((g) => (g as any).pin.kind),
      ['board', 'change', 'alight'],
    );
  });

  it('folds consecutive intermediate stops into one group', () => {
    const stopGroups = groups.filter((g) => g.kind === 'stops');

    assert.equal(stopGroups.length, 2);
    // "Ponta Delgada" ends leg 1 AND starts leg 2 — it is the change, not an
    // intermediate stop, so it must not be folded away here.
    assert.deepEqual((stopGroups[0] as any).pins.map((p: any) => p.name),
                     ['Serra Gorda', 'Fajã de Cima']);
    assert.deepEqual((stopGroups[1] as any).pins.map((p: any) => p.name), ['Lagoa']);
  });

  it('places each group between the actions it actually lies between', () => {
    assert.deepEqual(
      groups.map((g) => (g.kind === 'action' ? g.pin.kind : 'stops')),
      ['board', 'stops', 'change', 'stops', 'alight'],
    );
  });

  it('tags a group with the leg it belongs to', () => {
    const stopGroups = groups.filter((g) => g.kind === 'stops') as any[];

    assert.equal(stopGroups[0].legIndex, 0);
    assert.equal(stopGroups[1].legIndex, 1);
  });

  it('emits no group when a leg runs end to end with nothing between', () => {
    const direct = buildJourneyMapData(journey([rideLeg(1, '999')]), [
      geometry(1, '999', [
        { name: 'A', coord: CAPELAS },
        { name: 'B', coord: FURNAS },
      ], [CAPELAS, FURNAS]),
    ]);

    assert.deepEqual(
      groupJourneySteps(direct.pins).map((g) => g.kind),
      ['action', 'action'],
    );
  });

  it('handles an empty journey without inventing rows', () => {
    assert.deepEqual(groupJourneySteps([]), []);
  });

  it('gives every group a stable unique key', () => {
    const ids = groups.map((g) => (g.kind === 'action' ? g.pin.id : g.id));
    assert.equal(new Set(ids).size, ids.length);
  });
});


describe('the interchange is a decision, not a stop passed through', () => {
  const sameStop = [
    geometry(1, '219', [
      { name: 'Capelas', coord: CAPELAS },
      { name: 'Ponta Delgada', coord: HUB },
    ], [CAPELAS, HUB]),
    geometry(1, '318', [
      { name: 'Ponta Delgada', coord: HUB },
      { name: 'Furnas', coord: FURNAS },
    ], [HUB, FURNAS]),
  ];

  it('emits ONE pin where the rider gets off and back on in the same place', () => {
    const data = buildJourneyMapData(TWO_LEG, sameStop);
    const atHub = data.pins.filter((p) => p.name === 'Ponta Delgada');

    assert.equal(atHub.length, 1);
    assert.equal(atHub[0].kind, 'change');
  });

  it('numbers the actions without a gap', () => {
    const data = buildJourneyMapData(TWO_LEG, sameStop);

    assert.deepEqual(actionPins(data).map((p) => p.step), [1, 2, 3]);
  });

  it('keeps BOTH ends when the change involves a walk', () => {
    // Getting off at one pole and boarding at another is two decisions.
    const annex = { latitude: HUB.latitude + 0.0011, longitude: HUB.longitude };
    const walked = [
      geometry(1, '219', [
        { name: 'Capelas', coord: CAPELAS },
        { name: 'PDL (Alfândega)', coord: HUB },
      ], [CAPELAS, HUB]),
      geometry(2, '318', [
        { name: 'PDL (Terminal)', coord: annex },
        { name: 'Furnas', coord: FURNAS },
      ], [annex, FURNAS]),
    ];

    const data = buildJourneyMapData(TWO_LEG, walked);

    assert.deepEqual(
      actionPins(data).map((p) => [p.kind, p.name]),
      [
        ['board', 'Capelas'],
        ['alight', 'PDL (Alfândega)'],
        ['change', 'PDL (Terminal)'],
        ['alight', 'Furnas'],
      ],
    );
  });
});
