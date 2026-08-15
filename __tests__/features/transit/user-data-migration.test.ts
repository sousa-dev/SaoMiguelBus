/**
 * 03 §5d — saved data that points at the old network.
 *
 * The sharp one is `FavoriteStop`: it stores a `Stop` PRIMARY KEY. Legacy and
 * AzoresBus stop PKs come from the same sequence, so after the cutover a saved id
 * either points at a stop that is no longer in the active dataset or — worse —
 * silently resolves to an unrelated AzoresBus stop that happens to hold that PK.
 * A favourite called "Ajuda - Igreja" quietly becoming a stop in Nordeste is the
 * failure this exists to prevent.
 *
 * Nothing the user created is ever deleted. Someone who opens the app on
 * 1 September to find their saved stops gone reads that as data loss, not as a
 * network changeover.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  migrateUserData,
  resolveFavoriteRoutes,
  resolveFavoriteStops,
  resolveRecentSearches,
} from '@/features/transit/lib/user-data-migration';
import { ACTIVE_TRACK_TTL_MS, isTrackExpired } from '@/lib/bus-tracking';
import type { ActiveTrack } from '@/lib/profile-store';

const NEW_STOPS = [
  { id: 41, name: 'PONTA DELGADA (ALFÂNDEGA)', latitude: 37.73, longitude: -25.67 },
  { id: 88, name: 'Ajuda - Igreja', latitude: 37.8, longitude: -25.5 },
  { id: 91, name: 'LAGOA (IGREJA)', latitude: 37.74, longitude: -25.57 },
];

describe('resolveFavoriteStops — the PK-reuse case', () => {
  it('re-resolves by NAME and rewrites the id', () => {
    const favorites = [{ id: 12, name: 'Ajuda - Igreja' }];
    const [resolved] = resolveFavoriteStops(favorites, NEW_STOPS);

    assert.equal(resolved.id, 88, 'the id follows the name into the new dataset');
    assert.equal(resolved.name, 'Ajuda - Igreja');
    assert.equal(resolved.unavailable, undefined);
  });

  it('does NOT keep an id that now belongs to an unrelated stop', () => {
    // 41 is ALFÂNDEGA in the new dataset; the user saved "Ajuda - Igreja".
    const favorites = [{ id: 41, name: 'Ajuda - Igreja' }];
    const [resolved] = resolveFavoriteStops(favorites, NEW_STOPS);

    assert.equal(resolved.id, 88, 'the name wins, not the stale PK');
    assert.equal(resolved.name, 'Ajuda - Igreja');
  });

  it('keeps an unmatched favourite, flagged, rather than deleting it', () => {
    const favorites = [{ id: 7, name: 'Paragem Que Já Não Existe' }];
    const [resolved] = resolveFavoriteStops(favorites, NEW_STOPS);

    assert.equal(resolved.unavailable, true);
    assert.equal(resolved.name, 'Paragem Que Já Não Existe');
    assert.equal(resolved.id, 7, 'the original id is preserved for a later re-match');
  });

  it('matches accent- and case-insensitively', () => {
    const favorites = [{ id: 1, name: 'ponta delgada (alfandega)' }];
    const [resolved] = resolveFavoriteStops(favorites, NEW_STOPS);
    assert.equal(resolved.id, 41);
  });

  it('clears a previous unavailable flag when the stop comes back', () => {
    const favorites = [{ id: 7, name: 'Ajuda - Igreja', unavailable: true }];
    const [resolved] = resolveFavoriteStops(favorites, NEW_STOPS);
    assert.equal(resolved.unavailable, undefined);
    assert.equal(resolved.id, 88);
  });

  it('is a no-op when the stop list has not loaded', () => {
    const favorites = [{ id: 12, name: 'Ajuda - Igreja' }];
    assert.deepEqual(resolveFavoriteStops(favorites, []), favorites);
  });

  it('never drops a row', () => {
    const favorites = [
      { id: 12, name: 'Ajuda - Igreja' },
      { id: 7, name: 'Desaparecida' },
      { id: 41, name: 'LAGOA (IGREJA)' },
    ];
    assert.equal(resolveFavoriteStops(favorites, NEW_STOPS).length, 3);
  });
});

describe('resolveFavoriteRoutes — flagged, never hidden', () => {
  const routes = [
    { origin: 'Ajuda - Igreja', destination: 'LAGOA (IGREJA)', createdAt: '2026-08-01' },
    { origin: 'Ajuda - Igreja', destination: 'Sítio Fantasma', createdAt: '2026-08-02' },
  ];

  it('leaves a fully resolvable route alone', () => {
    const [ok] = resolveFavoriteRoutes(routes, NEW_STOPS);
    assert.equal(ok.unresolved, undefined);
  });

  it('flags the endpoint that no longer exists, and says which', () => {
    const [, broken] = resolveFavoriteRoutes(routes, NEW_STOPS);
    assert.deepEqual(broken.unresolved, ['destination']);
    assert.equal(broken.destination, 'Sítio Fantasma', 'the user typed this — keep it');
  });

  it('keeps both rows visible', () => {
    assert.equal(resolveFavoriteRoutes(routes, NEW_STOPS).length, 2);
  });

  it('is a no-op when the stop list has not loaded', () => {
    assert.deepEqual(resolveFavoriteRoutes(routes, []), routes);
  });
});

describe('resolveRecentSearches — disposable, so filtered', () => {
  const recents = [
    { origin: 'Ajuda - Igreja', destination: 'LAGOA (IGREJA)', day: 'weekday', time: '08h00', at: '' },
    { origin: 'Ajuda - Igreja', destination: 'Sítio Fantasma', day: 'weekday', time: '08h00', at: '' },
  ];

  it('drops entries that can no longer be searched', () => {
    const kept = resolveRecentSearches(recents, NEW_STOPS);
    assert.equal(kept.length, 1);
    assert.equal(kept[0].destination, 'LAGOA (IGREJA)');
  });

  it('does not rewrite the ones it keeps — recents are not worth repairing', () => {
    assert.deepEqual(resolveRecentSearches(recents, NEW_STOPS)[0], recents[0]);
  });

  it('is a no-op when the stop list has not loaded', () => {
    assert.deepEqual(resolveRecentSearches(recents, []), recents);
  });
});

/**
 * A village search ("Capelas") is now a valid, working search term (this
 * session's area-search feature) — but "Capelas" is not a literal `Stop.name`,
 * it only exists as a derived grouping over 2+ real stops. Without this fix, a
 * favourited "Capelas -> Ponta Delgada" route would be incorrectly flagged
 * `unresolved`, and a recent search for the same pair would be silently
 * dropped — both regressions the area feature would otherwise have introduced
 * into this already-shipped file.
 *
 * `resolveFavoriteStops` is deliberately NOT covered here with area-shaped
 * data: it REWRITES a favourite's stored id to whatever it matches
 * (`match.id`), and there is no real `Stop` row for "Capelas" to rewrite to —
 * extending its lookup to areas would silently reassign a stop favourite to
 * an arbitrary member id, which is the exact PK-reuse failure this file's own
 * docstring says it exists to prevent. That boundary is pinned below.
 */
const AREA_STOPS = [
  ...NEW_STOPS,
  { id: 101, name: 'CAPELAS (IGREJA)', latitude: 37.79, longitude: -25.7 },
  { id: 102, name: 'CAPELAS (MOAGEM)', latitude: 37.8, longitude: -25.71 },
];

describe('area-aware resolution — favourite routes and recents, not favourite stops', () => {
  it('a favourited village route is no longer flagged unresolved', () => {
    const routes = [
      { origin: 'Capelas', destination: 'Ajuda - Igreja', createdAt: '2026-08-01' },
    ];
    const [resolved] = resolveFavoriteRoutes(routes, AREA_STOPS);
    assert.equal(resolved.unresolved, undefined);
  });

  it('still flags a route naming a village with no real area behind it', () => {
    const routes = [
      { origin: 'Vila Fantasma', destination: 'Ajuda - Igreja', createdAt: '' },
    ];
    const [resolved] = resolveFavoriteRoutes(routes, AREA_STOPS);
    assert.deepEqual(resolved.unresolved, ['origin']);
  });

  it('a recent search for a village pair survives rather than being dropped', () => {
    const recents = [
      { origin: 'Capelas', destination: 'Ajuda - Igreja', day: 'weekday', time: '08h00', at: '' },
    ];
    assert.equal(resolveRecentSearches(recents, AREA_STOPS).length, 1);
  });

  it('area matching is case- and accent-insensitive, like stop matching', () => {
    const routes = [{ origin: 'capelas', destination: 'Ajuda - Igreja', createdAt: '' }];
    const [resolved] = resolveFavoriteRoutes(routes, AREA_STOPS);
    assert.equal(resolved.unresolved, undefined);
  });

  it('resolveFavoriteStops does NOT gain area awareness — no id to rewrite to', () => {
    // "Capelas" is not a real Stop; a favourite STOP literally named "Capelas"
    // must stay flagged unavailable, never silently reassigned to a member id.
    const favorites = [{ id: 5, name: 'Capelas' }];
    const [resolved] = resolveFavoriteStops(favorites, AREA_STOPS);
    assert.equal(resolved.unavailable, true);
    assert.equal(resolved.id, 5, 'never reassigned to CAPELAS (IGREJA) or (MOAGEM)');
  });
});

describe('migrateUserData — driven by the transition, never a date literal', () => {
  const state = {
    favoriteStops: [{ id: 41, name: 'Ajuda - Igreja' }],
    favoriteRoutes: [
      { origin: 'Ajuda - Igreja', destination: 'Sítio Fantasma', createdAt: '2026-08-02' },
    ],
    recentSearches: [
      { origin: 'Ajuda - Igreja', destination: 'Sítio Fantasma', day: 'weekday', time: '08h00', at: '' },
    ],
  };

  it('reports a change when something actually moved', () => {
    const result = migrateUserData(state, NEW_STOPS);
    assert.equal(result.changed, true);
    assert.equal(result.favoriteStops[0].id, 88);
    assert.deepEqual(result.favoriteRoutes[0].unresolved, ['destination']);
    assert.deepEqual(result.recentSearches, []);
  });

  it('reports no change when everything already resolves', () => {
    const settled = migrateUserData(
      {
        favoriteStops: [{ id: 88, name: 'Ajuda - Igreja' }],
        favoriteRoutes: [
          { origin: 'Ajuda - Igreja', destination: 'LAGOA (IGREJA)', createdAt: '' },
        ],
        recentSearches: [],
      },
      NEW_STOPS,
    );
    assert.equal(settled.changed, false, 'a no-op migration must not churn the store');
  });

  it('is a no-op with no stop list, so it cannot wipe data on a failed fetch', () => {
    const result = migrateUserData(state, []);
    assert.equal(result.changed, false);
    assert.deepEqual(result.favoriteStops, state.favoriteStops);
    assert.deepEqual(result.recentSearches, state.recentSearches);
  });
});

/**
 * 03 §5d claims tracked-bus "alarms" fire for trips that no longer run, and asks
 * for scheduled tracks to be cleared at the cutover. Checked before building it:
 * there are no OS alarms — tracking is in-app countdown state — and every track
 * carries a 4h TTL that `pruneTracking` enforces on mount and every 30 seconds
 * (features/transit/hooks/useBusTracking.ts). So a track cannot outlive the
 * cutover by more than its TTL, and no clearing code is needed.
 *
 * This test exists so that claim stays true: if the TTL is ever removed or
 * lengthened past a plausible offline window, it fails and the decision is
 * revisited.
 */
describe('tracked trips — 03 §5d clearing is redundant, and stays so', () => {
  const CUTOVER = Date.parse('2026-09-01T00:00:00Z');

  function track(createdAt: number): ActiveTrack {
    return {
      id: 't1', tripId: 1, routeNumber: '301',
      origin: 'A', destination: 'B', searchDay: 'weekday', searchDate: '2026-08-31',
      stops: [], nextDeparture: '23h00', estimatedArrival: '23h40',
      createdAt, expiresAt: createdAt + ACTIVE_TRACK_TTL_MS,
    };
  }

  it('expires a track started before the cutover within its TTL', () => {
    const started = CUTOVER - 60 * 60 * 1000; // 23:00, an hour before
    assert.equal(isTrackExpired(track(started), CUTOVER), false, 'still live at midnight');
    assert.equal(
      isTrackExpired(track(started), started + ACTIVE_TRACK_TTL_MS),
      true,
      'and gone a few hours later, with no changeover code involved',
    );
  });

  it('keeps the TTL short enough that no cutover clearing is needed', () => {
    assert.ok(
      ACTIVE_TRACK_TTL_MS <= 12 * 60 * 60 * 1000,
      'a longer TTL would let a track outlive the changeover — revisit §5d',
    );
  });
});
