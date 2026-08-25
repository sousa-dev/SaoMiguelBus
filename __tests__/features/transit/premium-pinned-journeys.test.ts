/**
 * 09 — premium pinning and tracking on the AzoresBus network.
 *
 * Legacy São Miguel had few useful transfers, so "one trip = one journey" held
 * and every premium affordance was built on it. AzoresBus is a transfer network:
 * a two-bus itinerary is a normal answer, and half of one is close to useless.
 *
 * The cases that carry weight here are the ones where a paying user's saved data
 * is at stake — the persist migration must never drop a record, and cutover day
 * must never turn a pinned list into dead rows.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  journeyAsPinnedRoute,
  hasMultipleRideLegs,
} from '@/features/transit/lib/journey-legs';
import {
  migrateUserData,
  pruneTracksForDataset,
  resolvePinnedRoutes,
} from '@/features/transit/lib/user-data-migration';
import {
  MAX_TRACK_TTL_MS,
  TRACK_GRACE_MS,
  computeJourneyStatus,
  deriveTrackExpiry,
  liftTrackedRecord,
  withDayOffsets,
} from '@/lib/bus-tracking';
import type { ActiveTrack, PinnedRoute, TrackedLeg } from '@/lib/profile-store';
import type { TransitJourney } from '@/lib/types';

const SEARCH_DATE = '2026-09-02';

/** Local instant on the search date, so the tests do not depend on the TZ. */
function at(hours: number, minutes: number, dayOffset = 0): Date {
  return new Date(2026, 8, 2 + dayOffset, hours, minutes, 0, 0);
}

function leg(over: Partial<TrackedLeg> = {}): TrackedLeg {
  return {
    tripId: 1,
    routeNumber: '110',
    origin: 'Ponta Delgada',
    destination: 'Lagoa',
    start: '09h15',
    end: '09h34',
    stops: withDayOffsets([
      { name: 'Ponta Delgada', time: '09h15' },
      { name: 'São Roque', time: '09h24' },
      { name: 'Lagoa', time: '09h34' },
    ]),
    ...over,
  };
}

const SECOND_LEG = leg({
  tripId: 2,
  routeNumber: '205',
  origin: 'Lagoa',
  destination: 'Vila Franca',
  start: '09h48',
  end: '10h21',
  stops: withDayOffsets([
    { name: 'Lagoa', time: '09h48' },
    { name: 'Água de Pau', time: '10h02' },
    { name: 'Vila Franca', time: '10h21' },
  ]),
});

function twoBusTrack(over: Partial<ActiveTrack> = {}): ActiveTrack {
  return {
    id: 't1',
    routeNumber: '110 → 205',
    origin: 'Ponta Delgada',
    destination: 'Vila Franca',
    searchDay: 'WEEKDAY',
    searchDate: SEARCH_DATE,
    journeyId: '1:2',
    dataset: 'azoresbus',
    legs: [leg(), SECOND_LEG],
    transfers: [{ at: 'Lagoa', from: 'Lagoa', waitMinutes: 14, walkMinutes: 0, tight: false }],
    nextDeparture: '09h15',
    estimatedArrival: '10h21',
    expiresAt: Number.MAX_SAFE_INTEGER,
    createdAt: 0,
    ...over,
  };
}

describe('computeJourneyStatus — the rider moves through the whole itinerary', () => {
  it('waits before the first bus, counting down to the FIRST departure', () => {
    const status = computeJourneyStatus(twoBusTrack(), at(8, 55));
    assert.equal(status.phase, 'waiting');
    assert.equal(status.timeToNextStopMin, 20);
    assert.equal(status.nextStop?.name, 'Ponta Delgada');
    assert.equal(status.progress, 0);
  });

  it('rides leg 0 with that leg’s own stops', () => {
    const status = computeJourneyStatus(twoBusTrack(), at(9, 26));
    assert.equal(status.phase, 'riding');
    assert.equal(status.legIndex, 0);
    assert.equal(status.currentStop?.name, 'São Roque');
    assert.equal(status.nextStop?.name, 'Lagoa');
  });

  it('reads the gap between buses as a WAIT, counting to the SECOND boarding', () => {
    // 09h40 — off the 110 at 09h34, the 205 does not leave until 09h48.
    const status = computeJourneyStatus(twoBusTrack(), at(9, 40));
    assert.equal(status.phase, 'transferring');
    assert.equal(status.nextStop?.name, 'Lagoa', 'the second boarding, not the first alight');
    assert.equal(status.timeToNextStopMin, 8);
    assert.equal(status.legIndex, 1, 'the leg they are about to board');
    assert.equal(status.transfer?.at, 'Lagoa');
  });

  it('flags a tight change — the one moment this feature is worth money', () => {
    const track = twoBusTrack({
      transfers: [{ at: 'Lagoa', from: 'Lagoa', waitMinutes: 4, walkMinutes: 3, tight: true }],
    });
    const status = computeJourneyStatus(track, at(9, 40));
    assert.equal(status.statusLabel.key, 'trackStatusTransferTight');
  });

  it('rides leg 1, then completes', () => {
    assert.equal(computeJourneyStatus(twoBusTrack(), at(10, 0)).legIndex, 1);
    assert.equal(computeJourneyStatus(twoBusTrack(), at(10, 0)).phase, 'riding');
    assert.equal(computeJourneyStatus(twoBusTrack(), at(11, 0)).phase, 'completed');
    assert.equal(computeJourneyStatus(twoBusTrack(), at(11, 0)).progress, 100);
  });

  it('walks the phases in order across the whole itinerary', () => {
    const phases = [at(8, 55), at(9, 26), at(9, 40), at(10, 0), at(11, 0)].map(
      (now) => computeJourneyStatus(twoBusTrack(), now).phase,
    );
    assert.deepEqual(phases, ['waiting', 'riding', 'transferring', 'riding', 'completed']);
  });

  it('returns i18n descriptors, never English literals (Gap D)', () => {
    const status = computeJourneyStatus(twoBusTrack(), at(8, 55));
    assert.equal(status.statusLabel.key, 'trackStatusWaiting');
    assert.equal(status.countdown.key, 'trackStatusMinutes');
    assert.deepEqual(status.countdown.params, { count: 20 });
  });
});

describe('dayOffset — a leg that crosses midnight', () => {
  it('stamps the day when the clock wraps backwards', () => {
    const stops = withDayOffsets([
      { name: 'Ponta Delgada', time: '23h40' },
      { name: 'Lagoa', time: '23h55' },
      { name: 'Vila Franca', time: '00h20' },
    ]);
    assert.deepEqual(
      stops.map((s) => s.dayOffset),
      [0, 0, 1],
    );
  });

  it('does not reorder the leg — the old code sorted on minutes-since-midnight', () => {
    const stops = withDayOffsets([
      { name: 'A', time: '23h40' },
      { name: 'B', time: '00h20' },
    ]);
    assert.deepEqual(
      stops.map((s) => s.name),
      ['A', 'B'],
      'travel order is what the server sent',
    );
  });

  it('counts down forwards past midnight rather than jumping backwards', () => {
    const nightTrack = twoBusTrack({
      legs: [
        leg({
          start: '23h40',
          end: '00h20',
          stops: withDayOffsets([
            { name: 'Ponta Delgada', time: '23h40' },
            { name: 'Lagoa', time: '23h55' },
            { name: 'Vila Franca', time: '00h20' },
          ]),
        }),
      ],
      transfers: [],
    });

    // 00h10 the NEXT calendar day: still riding, not "23 hours ago".
    const status = computeJourneyStatus(nightTrack, at(0, 10, 1));
    assert.equal(status.phase, 'riding');
    assert.equal(status.nextStop?.name, 'Vila Franca');
    assert.equal(status.timeToNextStopMin, 10, 'forwards, not negative');

    // And the progress bar must not run backwards over the wrap.
    const before = computeJourneyStatus(nightTrack, at(23, 50)).progress;
    const after = computeJourneyStatus(nightTrack, at(0, 10, 1)).progress;
    assert.ok(after > before, `progress went ${before} → ${after}`);
  });

  it('puts a leg boarded after midnight on the next day', () => {
    // Neither leg's own stop list wraps — only the boundary between them shows
    // that the change ran over midnight.
    const overnight = twoBusTrack({
      legs: [
        leg({
          start: '23h30',
          end: '23h55',
          stops: [
            { name: 'Ponta Delgada', time: '23h30' },
            { name: 'Lagoa', time: '23h55' },
          ],
        }),
        leg({
          tripId: 2,
          start: '00h20',
          end: '00h50',
          stops: [
            { name: 'Lagoa', time: '00h20' },
            { name: 'Vila Franca', time: '00h50' },
          ],
        }),
      ],
      transfers: [{ at: 'Lagoa', from: 'Lagoa', waitMinutes: 25, walkMinutes: 0, tight: false }],
    });

    // 23h58 — off the first bus, waiting for a bus that leaves after midnight.
    const waiting = computeJourneyStatus(overnight, at(23, 58));
    assert.equal(waiting.phase, 'transferring');
    assert.equal(waiting.timeToNextStopMin, 22, 'forwards to 00h20, not back a day');

    // 00h30 the next day — riding the second leg, not "completed hours ago".
    const riding = computeJourneyStatus(overnight, at(0, 30, 1));
    assert.equal(riding.phase, 'riding');
    assert.equal(riding.legIndex, 1);
  });
});

describe('deriveTrackExpiry — the 4h TTL was sized for one bus', () => {
  it('expires half an hour after the final arrival', () => {
    const now = at(9, 0).getTime();
    const expiry = deriveTrackExpiry([leg(), SECOND_LEG], SEARCH_DATE, now);
    assert.equal(expiry, at(10, 21).getTime() + TRACK_GRACE_MS);
  });

  it('outlives the old flat 4h TTL when a long wait needs it', () => {
    const longLeg = leg({
      start: '09h15',
      end: '15h30',
      stops: withDayOffsets([
        { name: 'Ponta Delgada', time: '09h15' },
        { name: 'Nordeste', time: '15h30' },
      ]),
    });
    const now = at(9, 0).getTime();
    const expiry = deriveTrackExpiry([longLeg], SEARCH_DATE, now);
    assert.ok(expiry > now + 4 * 60 * 60 * 1000, 'a 6h itinerary must not expire mid-trip');
  });

  it('clamps to 8h so a malformed record cannot pin a row on screen', () => {
    const absurd = leg({
      stops: withDayOffsets([
        { name: 'A', time: '09h00' },
        { name: 'B', time: '08h00' }, // wraps → day 1
        { name: 'C', time: '07h00' }, // wraps → day 2
      ]),
    });
    const now = at(9, 0).getTime();
    assert.equal(deriveTrackExpiry([absurd], SEARCH_DATE, now), now + MAX_TRACK_TTL_MS);
  });
});

describe('journeyAsPinnedRoute — the whole itinerary, not one leg', () => {
  const journey: TransitJourney = {
    id: '1:2',
    transfers: 1,
    start: '09h15',
    end: '10h21',
    durationMinutes: 66,
    waitMinutes: 14,
    dayOffset: 0,
    typeOfDay: 'WEEKDAY',
    legs: [
      {
        kind: 'ride',
        tripId: 1,
        route: '110',
        likesPercent: 0,
        dislikesPercent: 0,
        information: {},
        board: { name: 'Capelas - Igreja', time: '09h15', sequence: 3, dayOffset: 0 },
        alight: { name: 'Lagoa', time: '09h34', sequence: 9, dayOffset: 0 },
        stops: [
          { name: 'Capelas - Igreja', time: '09h15' },
          { name: 'Lagoa', time: '09h34' },
        ],
      },
      {
        kind: 'transfer',
        at: 'Lagoa',
        from: 'Lagoa',
        waitMinutes: 14,
        walkMinutes: 0,
        slackMinutes: 14,
        tight: false,
        fromRoute: '110',
        toRoute: '205',
      },
      {
        kind: 'ride',
        tripId: 2,
        route: '205',
        likesPercent: 0,
        dislikesPercent: 0,
        information: {},
        board: { name: 'Lagoa', time: '09h48', sequence: 1, dayOffset: 0 },
        alight: { name: 'Vila Franca', time: '10h21', sequence: 12, dayOffset: 0 },
        stops: [
          { name: 'Lagoa', time: '09h48' },
          { name: 'Vila Franca', time: '10h21' },
        ],
      },
    ],
  };

  const identity = (route: string) => route;

  it('names both buses', () => {
    const pin = journeyAsPinnedRoute(journey, 'WEEKDAY', 'azoresbus', identity);
    assert.equal(pin.routeNumber, '110 → 205');
    assert.equal(pin.legs.length, 2);
  });

  it('takes endpoints from the LEGS, not the search terms', () => {
    // A search for "Capelas" resolves to a village area over several poles;
    // storing the query would lose which pole the itinerary actually used.
    const pin = journeyAsPinnedRoute(journey, 'WEEKDAY', 'azoresbus', identity);
    assert.equal(pin.origin, 'Capelas - Igreja');
    assert.equal(pin.destination, 'Vila Franca');
  });

  it('carries the change, so the rider is not left to re-derive it', () => {
    const pin = journeyAsPinnedRoute(journey, 'WEEKDAY', 'azoresbus', identity);
    assert.equal(pin.transfers.length, 1);
    assert.equal(pin.transfers[0].at, 'Lagoa');
    assert.equal(pin.transfers[0].waitMinutes, 14);
  });

  it('keeps the server’s sequences rather than re-matching by name (98 B7)', () => {
    const pin = journeyAsPinnedRoute(journey, 'WEEKDAY', 'azoresbus', identity);
    assert.equal(pin.legs[0].boardSequence, 3);
    assert.equal(pin.legs[0].alightSequence, 9);
  });

  it('stamps the network it was created against', () => {
    assert.equal(journeyAsPinnedRoute(journey, 'WEEKDAY', 'azoresbus', identity).dataset, 'azoresbus');
    assert.equal(journeyAsPinnedRoute(journey, 'WEEKDAY', null, identity).dataset, undefined);
  });

  it('knows when a per-leg button would be a duplicate', () => {
    assert.equal(hasMultipleRideLegs(journey), true);
    assert.equal(
      hasMultipleRideLegs({ ...journey, legs: [journey.legs[0]] }),
      false,
      'a direct journey needs only the card-level action',
    );
  });
});

describe('persist migration — a subscriber must never lose their pins', () => {
  it('lifts an old single-trip pin into the multi-leg shape', () => {
    const old = {
      id: 'p1',
      tripId: 42,
      routeNumber: '110',
      origin: 'Ponta Delgada',
      destination: 'Lagoa',
      searchDay: 'WEEKDAY',
      stops: [
        { name: 'Ponta Delgada', time: '09h15' },
        { name: 'Lagoa', time: '09h34' },
      ],
      pinnedAt: 1,
    };
    const lifted = liftTrackedRecord(old) as unknown as PinnedRoute;
    assert.equal(lifted.legs.length, 1);
    assert.equal(lifted.legs[0].tripId, 42);
    assert.equal(lifted.legs[0].start, '09h15');
    assert.equal(lifted.legs[0].end, '09h34');
    assert.deepEqual(lifted.transfers, []);
    assert.equal(lifted.id, 'p1', 'everything else survives');
  });

  it('prefers the track’s own departure/arrival when it has them', () => {
    const lifted = liftTrackedRecord({
      tripId: 7,
      routeNumber: '110',
      origin: 'A',
      destination: 'B',
      nextDeparture: '08h00',
      estimatedArrival: '08h45',
      stops: [{ name: 'A', time: '08h00' }],
    }) as unknown as ActiveTrack;
    assert.equal(lifted.legs[0].start, '08h00');
    assert.equal(lifted.legs[0].end, '08h45');
  });

  it('passes an already-migrated record through untouched', () => {
    const already = { id: 'p2', legs: [leg()], transfers: [] };
    assert.equal(liftTrackedRecord(already), already);
  });

  it('KEEPS an unrecognised record rather than dropping it', () => {
    // The failure this whole document exists to prevent is a paying user opening
    // the app after an update to find their pins gone. A row we cannot parse is
    // kept with empty legs — it renders as unavailable and can be deleted by
    // hand; a missing row reads as data loss.
    const junk = { id: 'p3', somethingElse: true } as Record<string, unknown>;
    const lifted = liftTrackedRecord(junk) as Record<string, unknown>;
    assert.equal(lifted.id, 'p3');
    assert.deepEqual(lifted.legs, []);
    assert.equal(lifted.somethingElse, true, 'unknown fields survive too');
  });

  it('backfills transfers on a record that has legs but no transfers', () => {
    const lifted = liftTrackedRecord({ id: 'p4', legs: [leg()] }) as unknown as PinnedRoute;
    assert.deepEqual(lifted.transfers, []);
  });
});

describe('cutover — pins re-resolve or grey, tracks are cleared (§3.5)', () => {
  const NEW_STOPS = [
    { id: 41, name: 'Ponta Delgada', latitude: 37.73, longitude: -25.67 },
    { id: 88, name: 'Vila Franca', latitude: 37.71, longitude: -25.43 },
  ];

  function pin(over: Partial<PinnedRoute> = {}): PinnedRoute {
    return {
      id: 'p1',
      routeNumber: '110 → 205',
      origin: 'Ponta Delgada',
      destination: 'Vila Franca',
      searchDay: 'WEEKDAY',
      legs: [leg(), SECOND_LEG],
      transfers: [],
      pinnedAt: 1,
      tripId: 1,
      ...over,
    };
  }

  it('drops stale trip ids when the endpoints resolve', () => {
    // A trip PK from the other network is worse than none: PKs are reused across
    // datasets, so a kept id silently addresses an unrelated AzoresBus trip.
    const [resolved] = resolvePinnedRoutes([pin()], NEW_STOPS, 'azoresbus');
    assert.equal(resolved.unavailable, undefined);
    assert.equal(resolved.dataset, 'azoresbus');
    assert.ok(
      resolved.legs.every((l) => l.tripId === undefined),
      'no stale PK may survive the cutover',
    );
    assert.equal(resolved.tripId, undefined);
  });

  it('keeps everything else the pin needs to re-run its search', () => {
    const [resolved] = resolvePinnedRoutes([pin()], NEW_STOPS, 'azoresbus');
    assert.equal(resolved.origin, 'Ponta Delgada');
    assert.equal(resolved.destination, 'Vila Franca');
    assert.equal(resolved.routeNumber, '110 → 205');
    assert.equal(resolved.legs.length, 2);
  });

  it('greys an unresolvable pin — never deletes it', () => {
    const gone = pin({ id: 'p9', origin: 'Stop That No Longer Exists' });
    const [resolved] = resolvePinnedRoutes([gone], NEW_STOPS, 'azoresbus');
    assert.equal(resolved.unavailable, true);
    assert.equal(resolved.id, 'p9', 'the row is still there');
  });

  it('clears the flag when a stop comes back', () => {
    const [resolved] = resolvePinnedRoutes([pin({ unavailable: true })], NEW_STOPS, 'azoresbus');
    assert.equal(resolved.unavailable, undefined);
  });

  it('is a no-op on an empty stop list — never a wipe', () => {
    const input = [pin()];
    assert.equal(resolvePinnedRoutes(input, []), input);
  });

  it('clears active tracks built against the other network', () => {
    const tracks = [
      twoBusTrack({ id: 'a', dataset: 'legacy' }),
      twoBusTrack({ id: 'b', dataset: 'azoresbus' }),
    ];
    assert.deepEqual(
      pruneTracksForDataset(tracks, 'azoresbus').map((t) => t.id),
      ['b'],
    );
  });

  it('leaves tracks alone while the dataset is still unknown', () => {
    const tracks = [twoBusTrack({ id: 'a', dataset: 'legacy' })];
    assert.equal(pruneTracksForDataset(tracks, null).length, 1);
  });

  it('spares an UNSTAMPED track rather than guessing it is stale', () => {
    // A track started before bootstrap resolved carries no stamp. Dropping it
    // would clear a countdown the user began seconds earlier, the moment the
    // dataset landed; it expires on its own within hours instead.
    const tracks = [twoBusTrack({ id: 'a', dataset: undefined })];
    assert.equal(pruneTracksForDataset(tracks, 'azoresbus').length, 1);
  });

  it('runs pins and tracks through the one migration step', () => {
    const result = migrateUserData(
      {
        favoriteStops: [],
        favoriteRoutes: [],
        recentSearches: [],
        pinned: [pin()],
        active: [twoBusTrack({ dataset: 'legacy' })],
      },
      NEW_STOPS,
      'azoresbus',
    );
    assert.equal(result.changed, true);
    assert.equal(result.pinned.length, 1, 'pins are repaired, not removed');
    assert.equal(result.active.length, 0, 'tracks from the old network are cleared');
  });

  it('reports no change when there is nothing to repair', () => {
    const result = migrateUserData(
      { favoriteStops: [], favoriteRoutes: [], recentSearches: [] },
      NEW_STOPS,
      'azoresbus',
    );
    assert.equal(result.changed, false);
  });
});
