/**
 * Offline one-transfer journey search.
 *
 * The server runs the same scan (`transit/services/journeys.py`), and the two
 * must agree: a rider who searches online, boards, loses signal and searches
 * again has to see the same itinerary. So these tests pin the RULES — the
 * transfer buffer, the same-line exclusion, the dominance prune — against the
 * same scenarios `transit/tests/test_journeys.py` pins on the server.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { offlineJourneySearchV2, type OfflineBundleV2 } from '@/lib/offline-bundle-v2';
import { MAX_TRANSFER_WAIT_MINUTES, waitIsReasonable } from '@/lib/journey-search';
import {
  MIN_TRANSFER_MINUTES,
  TIGHT_TRANSFER_MINUTES,
  TRANSFER_RADIUS_M,
  buildTransferNeighbours,
  hasUsablePosition,
  walkMinutes,
} from '@/lib/transfer-points';

const CAPELAS = { latitude: 37.828, longitude: -25.677 };
const HUB = { latitude: 37.74, longitude: -25.668 };
const FURNAS = { latitude: 37.772, longitude: -25.31 };

const STOPS = [
  { id: 1, name: 'CAPELAS (IGREJA)', ...CAPELAS },
  { id: 2, name: 'PONTA DELGADA', ...HUB },
  { id: 3, name: 'FURNAS', ...FURNAS },
  // ~122 m north of the hub — a different bay of the same terminal.
  { id: 4, name: 'PONTA DELGADA (TERMINAL)', latitude: HUB.latitude + 0.0011, longitude: HUB.longitude },
  // Across town: inside the same village, far outside walking range.
  { id: 5, name: 'OUTRO SITIO', latitude: HUB.latitude + 0.02, longitude: HUB.longitude },
];

const hhmm = (hours: number, minutes: number) => hours * 3600 + minutes * 60;

type Row = OfflineBundleV2['routes'][number];

function row(
  id: number,
  line: string,
  stops: [number, number, number][],
): Row {
  return {
    id,
    line,
    service: 'everyday',
    stops: stops.map(([stopId]) => STOPS.findIndex((s) => s.id === stopId)),
    codes: stops.map(() => null),
    times: stops.map(([, hour, minute]) => hhmm(hour, minute)),
    offsets: stops.map(() => 0),
  };
}

function bundle(routes: Row[]): OfflineBundleV2 {
  return {
    schema: 2,
    version: 'test',
    generatedAt: '',
    island: 'sao-miguel',
    dataset: 'azoresbus',
    cutoverAt: null,
    nextTransitionAt: null,
    phase: 'current',
    holidays: [],
    stops: STOPS,
    services: {
      everyday: { days: '1111111', from: null, to: null, added: [], removed: [] },
    },
    routes,
  };
}

const WEST = row(1, '315', [[1, 8, 10], [2, 8, 55]]);
const EAST = row(2, '110', [[2, 9, 30], [3, 11, 5]]);
const WEDNESDAY = '2026-08-19';

function searchFull(
  routes: Row[],
  origin = 'Capelas (Igreja)',
  destination = 'Furnas',
  maxTransfers?: number,
) {
  return offlineJourneySearchV2(bundle(routes), {
    origin,
    destination,
    isoDate: WEDNESDAY,
    maxTransfers,
  });
}

function search(routes: Row[], origin = 'Capelas (Igreja)', destination = 'Furnas') {
  return searchFull(routes, origin, destination).journeys;
}

describe('offlineJourneySearchV2 — transfers', () => {
  it('finds a two-bus journey where direct search finds nothing', () => {
    const journeys = search([WEST, EAST]);

    assert.equal(journeys.length, 1);
    assert.equal(journeys[0].transfers, 1);
    assert.deepEqual(
      journeys[0].legs.map((leg) => leg.kind),
      ['ride', 'transfer', 'ride'],
    );
  });

  it('reports the rider’s own times and wait, not the trips’', () => {
    const journey = search([WEST, EAST])[0];

    assert.equal(journey.start, '08h10');
    assert.equal(journey.end, '11h05');
    assert.equal(journey.durationMinutes, 175);
    assert.equal(journey.waitMinutes, 35);
  });

  it('names the interchange on the transfer leg', () => {
    const transfer = search([WEST, EAST])[0].legs[1];

    assert.equal(transfer.kind, 'transfer');
    if (transfer.kind !== 'transfer') return;
    assert.equal(transfer.at, 'PONTA DELGADA');
    assert.equal(transfer.waitMinutes, 35);
    assert.equal(transfer.walkMinutes, 0);
    assert.equal(transfer.fromRoute, '315');
    assert.equal(transfer.toRoute, '110');
  });

  it('does not offer a connection that leaves before the first bus lands', () => {
    const tooEarly = row(2, '110', [[2, 8, 56], [3, 10, 30]]);

    assert.deepEqual(search([WEST, tooEarly]), []);
  });

  it('enforces the minimum transfer buffer', () => {
    const tight = row(2, '110', [
      [2, 8, 55 + MIN_TRANSFER_MINUTES - 1],
      [3, 10, 30],
    ]);

    assert.deepEqual(search([WEST, tight]), []);
  });

  it('does not call a change onto the same line a transfer', () => {
    const sameLine = row(2, '315', [[2, 9, 30], [3, 11, 5]]);

    assert.deepEqual(search([WEST, sameLine]), []);
  });

  it('connects through a walkable stop at the interchange', () => {
    const fromAnnex = row(2, '110', [[4, 9, 30], [3, 11, 5]]);
    const journeys = search([WEST, fromAnnex]);

    assert.equal(journeys.length, 1);
    const transfer = journeys[0].legs[1];
    assert.equal(transfer.kind, 'transfer');
    if (transfer.kind !== 'transfer') return;
    assert.equal(transfer.at, 'PONTA DELGADA (TERMINAL)');
    assert.ok(transfer.walkMinutes > 0);
  });

  it('does not treat a stop across town as an interchange', () => {
    const farAway = row(2, '110', [[5, 9, 30], [3, 11, 5]]);

    assert.deepEqual(search([WEST, farAway]), []);
  });
});

describe('offlineJourneySearchV2 — ranking', () => {
  it('drops a two-bus journey a direct bus beats on every axis', () => {
    const direct = row(3, '999', [[1, 8, 10], [3, 10, 0]]);
    const journeys = search([WEST, EAST, direct]);

    assert.deepEqual(journeys.map((j) => j.transfers), [0]);
  });

  it('keeps a two-bus journey that leaves later than the direct bus', () => {
    const early = row(3, '999', [[1, 6, 0], [3, 12, 0]]);
    const journeys = search([WEST, EAST, early]);

    assert.deepEqual(
      journeys.map((j) => j.transfers).sort(),
      [0, 1],
    );
  });

  it('returns a direct ride as a single-leg journey', () => {
    const direct = row(3, '999', [[1, 8, 10], [3, 10, 0]]);
    const journey = search([direct])[0];

    assert.equal(journey.transfers, 0);
    assert.equal(journey.legs.length, 1);
    assert.equal(journey.waitMinutes, 0);
  });

  it('returns nothing when a stop does not resolve', () => {
    assert.deepEqual(search([WEST, EAST], 'Nowhere', 'Also nowhere'), []);
  });
});

describe('offlineJourneySearchV2 — faults found on production data', () => {
  it('never offers a leg whose clock runs backwards', () => {
    // Legacy line 206 reaches sequence 12 at 08h20 and 13 at 08h10. The
    // sequence is in order; only the clock disagrees.
    const backwards = row(4, '206', [[2, 8, 0], [1, 8, 20], [3, 8, 10]]);

    assert.deepEqual(search([backwards]), []);
  });

  it('does not let a backwards leg poison a transfer', () => {
    const backwards = row(4, '206', [[1, 8, 20], [2, 8, 10]]);
    const onward = row(5, '110', [[2, 9, 30], [3, 11, 5]]);

    assert.deepEqual(search([backwards, onward]), []);
  });

  it('drops a 2-minute hop bolted onto a 5-hour wait', () => {
    // Production: ride 00h53 -> 00h55, wait 5h29, then take the 06h24.
    const hop = row(6, '215', [[1, 0, 53], [4, 0, 55]]);
    const onward = row(7, '218', [[4, 6, 24], [2, 6, 58]]);

    const journeys = search([hop, onward], 'Capelas (Igreja)', 'Ponta Delgada');
    assert.deepEqual(journeys.map((j) => j.transfers), []);
  });

  it('keeps a long wait when the ride is long too', () => {
    // Saturday's only Capelas -> Furnas connection waits 241 minutes.
    const first = row(8, '207', [[1, 9, 59], [2, 10, 59]]);
    const second = row(9, '318', [[2, 15, 0], [3, 16, 30]]);

    const journeys = search([first, second]);
    assert.equal(journeys.length, 1);
    assert.equal(journeys[0].waitMinutes, 241);
  });

  it('returns nothing for a place to itself', () => {
    const journeys = search([WEST, EAST], 'Capelas (Igreja)', 'Capelas (Igreja)');
    assert.deepEqual(journeys, []);
  });
});

describe('waitIsReasonable', () => {
  const journey = (wait: number, rideMinutes: number) => ({
    legs: [
      { departure: 0, arrival: rideMinutes } as never,
    ],
    waits: [wait],
  });

  it('accepts a direct journey, which never waits', () => {
    assert.equal(waitIsReasonable({ legs: [], waits: [] }), true);
  });

  it('rejects a wait beyond the absolute ceiling', () => {
    assert.equal(waitIsReasonable(journey(MAX_TRANSFER_WAIT_MINUTES + 1, 600)), false);
  });

  it('rejects a wait out of proportion to the ride', () => {
    // 329 minutes waiting for 36 minutes of bus — the production case.
    assert.equal(waitIsReasonable(journey(120, 36)), false);
  });

  it('accepts a long wait in proportion to a long ride', () => {
    assert.equal(waitIsReasonable(journey(241, 150)), true);
  });
});

describe('buildTransferNeighbours', () => {
  it('always includes the stop itself, at the minimum buffer', () => {
    const neighbours = buildTransferNeighbours(STOPS);

    assert.ok(
      neighbours.get(2)?.some(([id, cost]) => id === 2 && cost === MIN_TRANSFER_MINUTES),
    );
  });

  it('links stops within walking range and excludes the rest', () => {
    const reachable = (neighbours: Map<number, [number, number][]>, id: number) =>
      new Set(neighbours.get(id)?.map(([other]) => other));

    const neighbours = buildTransferNeighbours(STOPS);

    assert.ok(reachable(neighbours, 2).has(4), 'the terminal annex is walkable');
    assert.ok(!reachable(neighbours, 2).has(5), 'across town is not');
    assert.ok(!reachable(neighbours, 2).has(1), 'another village is not');
  });

  it('charges walking time on top of the buffer', () => {
    const neighbours = buildTransferNeighbours(STOPS);
    const annex = neighbours.get(2)?.find(([id]) => id === 4);

    assert.ok(annex);
    assert.ok(annex![1] > MIN_TRANSFER_MINUTES);
  });

  it('is symmetric — a walkable pair costs the same both ways', () => {
    const neighbours = buildTransferNeighbours(STOPS);
    const there = neighbours.get(2)?.find(([id]) => id === 4);
    const back = neighbours.get(4)?.find(([id]) => id === 2);

    assert.ok(there && back, 'the pair is reachable in both directions');
    assert.equal(there![1], back![1]);
  });

  it('rounds walking time up — a part-minute walk still costs a minute', () => {
    assert.equal(walkMinutes(0), 0);
    assert.equal(walkMinutes(1), 1);
    assert.equal(walkMinutes(TRANSFER_RADIUS_M), 4);
  });

  it('never makes Null Island an interchange', () => {
    // Two unlocated stops sit at (0, 0), measure zero metres apart, and would
    // otherwise connect two villages 40 km apart.
    const unlocated = [
      { id: 10, name: 'A', latitude: 0, longitude: 0 },
      { id: 11, name: 'B', latitude: 0, longitude: 0 },
    ];
    const neighbours = buildTransferNeighbours(unlocated);

    assert.deepEqual(neighbours.get(10), [[10, MIN_TRANSFER_MINUTES]]);
    assert.deepEqual(neighbours.get(11), [[11, MIN_TRANSFER_MINUTES]]);
  });

  it('still allows a same-stop change at an unlocated stop', () => {
    const neighbours = buildTransferNeighbours([
      { id: 10, name: 'A', latitude: 0, longitude: 0 },
    ]);

    assert.deepEqual(neighbours.get(10), [[10, MIN_TRANSFER_MINUTES]]);
  });

  it('rejects non-finite coordinates', () => {
    assert.equal(hasUsablePosition(Number.NaN, -25.6), false);
    assert.equal(hasUsablePosition(37.7, Number.POSITIVE_INFINITY), false);
    assert.equal(hasUsablePosition(37.7, -25.6), true);
  });
});


describe('offlineJourneySearchV2 — maxTransfers', () => {
  it('allows a change of bus by default', () => {
    const result = searchFull([WEST, EAST]);

    assert.equal(result.maxTransfers, 1);
    assert.deepEqual(result.journeys.map((j) => j.transfers), [1]);
  });

  it('returns only single-bus journeys when asked for direct only', () => {
    const result = searchFull([WEST, EAST], 'Capelas (Igreja)', 'Furnas', 0);

    assert.equal(result.maxTransfers, 0);
    assert.deepEqual(result.journeys, []);
  });

  it('reports how many a change WOULD find, so the retry is honest', () => {
    const result = searchFull([WEST, EAST], 'Capelas (Igreja)', 'Furnas', 0);

    assert.equal(result.transfersAvailable, 1);
  });

  it('reports zero when a change would not help either', () => {
    // Nothing serves Furnas at all — the prompt must not be offered.
    const result = searchFull([WEST], 'Capelas (Igreja)', 'Furnas', 0);

    assert.deepEqual(result.journeys, []);
    assert.equal(result.transfersAvailable, 0);
  });

  it('omits the hint when the direct-only search already found something', () => {
    const direct = row(3, '999', [[1, 8, 10], [3, 10, 0]]);
    const result = searchFull([WEST, EAST, direct], 'Capelas (Igreja)', 'Furnas', 0);

    assert.equal(result.journeys.length, 1);
    assert.equal(result.transfersAvailable, undefined);
  });

  it('omits the hint when transfers were allowed anyway', () => {
    assert.equal(searchFull([WEST, EAST]).transfersAvailable, undefined);
  });

  it('leaves direct journeys identical either way', () => {
    const direct = row(3, '999', [[1, 8, 10], [3, 10, 0]]);
    const capped = searchFull([WEST, EAST, direct], 'Capelas (Igreja)', 'Furnas', 0);
    const uncapped = searchFull([WEST, EAST, direct]).journeys.filter(
      (j) => j.transfers === 0,
    );

    assert.deepEqual(
      capped.journeys.map((j) => j.id),
      uncapped.map((j) => j.id),
    );
  });
});

describe('offlineJourneySearchV2 — tight transfer warning', () => {
  const transferLeg = (routes: Row[]) => {
    const journeys = search(routes);
    assert.ok(journeys.length > 0, 'expected a journey to inspect');
    const leg = journeys[0].legs.find((l) => l.kind === 'transfer');
    assert.ok(leg && leg.kind === 'transfer');
    return leg;
  };

  it('does not flag a comfortable change', () => {
    const onward = row(2, '110', [[2, 9, 45], [3, 11, 5]]);
    const leg = transferLeg([WEST, onward]);

    assert.equal(leg.waitMinutes, 50);
    assert.equal(leg.slackMinutes, 50);
    assert.equal(leg.tight, false);
  });

  it('flags a rushed change', () => {
    const onward = row(2, '110', [[2, 9, 5], [3, 11, 5]]);
    const leg = transferLeg([WEST, onward]);

    assert.equal(leg.slackMinutes, 10);
    assert.equal(leg.tight, true);
  });

  it('subtracts the walk before judging', () => {
    // 25 minutes looks fine until the walk to the other bay comes out of it.
    const onward = row(2, '110', [[4, 9, 20], [3, 11, 5]]);
    const leg = transferLeg([WEST, onward]);

    assert.equal(leg.waitMinutes, 25);
    assert.ok(leg.walkMinutes > 0);
    assert.equal(leg.slackMinutes, 25 - leg.walkMinutes);
    assert.equal(leg.tight, true);
  });

  it('never reports negative slack', () => {
    const onward = row(2, '110', [[4, 9, 2], [3, 11, 5]]);
    const leg = transferLeg([WEST, onward]);

    assert.ok(leg.slackMinutes >= 0);
  });

  it('treats exactly the threshold as comfortable', () => {
    const onward = row(2, '110', [[2, 8, 55 + TIGHT_TRANSFER_MINUTES], [3, 11, 5]]);
    const leg = transferLeg([WEST, onward]);

    assert.equal(leg.slackMinutes, TIGHT_TRANSFER_MINUTES);
    assert.equal(leg.tight, false);
  });
});
