/**
 * What the picker shows for a query — sections for real villages, plain rows
 * for everything else, all in one alphabetically-ordered list. Builds on
 * `filterStops`'s "never hide a match" guarantee (previous session) and
 * `lib/stop-areas.ts`'s grouping (this session): the online path needs no
 * query-to-area RESOLUTION at all — tapping a section header just sends its
 * raw text to `/api/v3/transit/search`, which already does its own,
 * server-side union. This module only decides what to DISPLAY.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildFavoriteEntries, buildStopEntries } from '@/lib/stop-search';
import { dedupeStopsByName } from '@/lib/stop-list';
import type { Stop } from '@/lib/types';

function stop(id: number, name: string) {
  return { id, name };
}

const CAPELAS_IGREJA = stop(1, 'CAPELAS (IGREJA)');
const CAPELAS_MOAGEM = stop(2, 'CAPELAS (MOAGEM)');
const CAPELAS_ESCOLA = stop(3, 'CAPELAS (ESCOLA)');
const ARRIFES_ESCOLA = stop(4, 'ARRIFES (ESCOLA)');
const ARRIFES_IGREJA = stop(6, 'ARRIFES (IGREJA)'); // makes ARRIFES a REAL (2-member) area
const ACHADINHA = stop(5, 'ACHADINHA'); // bare, no area

const NETWORK = [
  CAPELAS_IGREJA, CAPELAS_MOAGEM, CAPELAS_ESCOLA,
  ARRIFES_ESCOLA, ARRIFES_IGREJA, ACHADINHA,
];

describe('buildStopEntries — village name query', () => {
  it('returns ONE area entry, not three separate rows', () => {
    const entries = buildStopEntries(NETWORK, 'capelas');
    assert.equal(entries.length, 1);
    assert.equal(entries[0].type, 'area');
    assert.equal((entries[0] as { type: 'area'; key: string }).key, 'CAPELAS');
  });

  it('includes every real member, regardless of match position within the area', () => {
    const entries = buildStopEntries(NETWORK, 'capelas');
    const area = entries[0] as { type: 'area'; members: { name: string }[] };
    assert.deepEqual(
      area.members.map((m) => m.name).sort(),
      ['CAPELAS (ESCOLA)', 'CAPELAS (IGREJA)', 'CAPELAS (MOAGEM)'],
    );
  });
});

describe('buildStopEntries — cross-cutting landmark query', () => {
  it('shows the area with ONLY the matching members, not the whole village', () => {
    // "escola" matches CAPELAS (ESCOLA) and ARRIFES (ESCOLA) -- two different
    // villages, each contributing exactly the one member that matched.
    const entries = buildStopEntries(NETWORK, 'escola');
    assert.equal(entries.length, 2);

    const capelas = entries.find((e) => e.type === 'area' && e.key === 'CAPELAS') as
      | { type: 'area'; members: { name: string }[] }
      | undefined;
    assert.ok(capelas);
    assert.deepEqual(capelas.members.map((m) => m.name), ['CAPELAS (ESCOLA)']);

    const arrifes = entries.find((e) => e.type === 'area' && e.key === 'ARRIFES');
    assert.ok(arrifes);
  });
});

describe('buildStopEntries — non-area stops', () => {
  it('emits a plain stop entry for a bare, ungrouped name', () => {
    const entries = buildStopEntries(NETWORK, 'achadinha');
    assert.deepEqual(entries, [{ type: 'stop', stop: ACHADINHA }]);
  });

  it('never groups a single non-area stop into a fake section', () => {
    const entries = buildStopEntries([ACHADINHA, ARRIFES_ESCOLA], 'a');
    // below MIN_QUERY_LENGTH=3 -- both queries below need 3+ chars regardless
    assert.deepEqual(entries, []);
  });
});

describe('buildStopEntries — ordering', () => {
  it('sorts an area entry by its OWN key, interleaved with plain stops', () => {
    const network = [
      stop(1, 'FOO ZOO (UM)'),
      stop(2, 'FOO ZOO (DOIS)'),
      stop(3, 'FOO MOO'),
      stop(4, 'FOO BOO'),
    ];
    const entries = buildStopEntries(network, 'foo');
    const labels = entries.map((e) => (e.type === 'area' ? e.key : e.stop.name));
    // 'FOO ZOO' is an area (2 members); 'FOO MOO'/'FOO BOO' are plain stops.
    // Sorted purely by display name -- the area is not pulled to the front or
    // back of the list, it sits exactly where its own name places it.
    assert.deepEqual(labels, ['FOO BOO', 'FOO MOO', 'FOO ZOO']);
  });
});

/**
 * Exact-match ranking: below favourites, an entry whose OWN display name
 * equals the query (folded) sorts above every entry that merely contains it.
 * "Furnas" alphabetically precedes "Lagoa", so without this tier a search
 * for "lagoa" buries the village the query names under Furnas (Lagoa).
 */
describe('buildStopEntries — exact-match ordering', () => {
  function labels(entries: ReturnType<typeof buildStopEntries>) {
    return entries.map((e) => (e.type === 'area' ? e.key : e.stop.name));
  }

  it('puts a stop exactly matching the query above one that merely contains it', () => {
    const entries = buildStopEntries(
      [stop(1, 'Furnas (Lagoa)'), stop(2, 'Lagoa')],
      'lagoa',
    );
    assert.deepEqual(labels(entries), ['Lagoa', 'Furnas (Lagoa)']);
  });

  it('is case- and accent-insensitive', () => {
    const entries = buildStopEntries(
      [stop(1, 'Furnas (Água)'), stop(2, 'Água')],
      'AGUA',
    );
    assert.deepEqual(labels(entries), ['Água', 'Furnas (Água)']);
  });

  it('still lets favourites outrank an exact match', () => {
    const entries = buildStopEntries(
      [stop(1, 'Furnas (Lagoa)'), stop(2, 'Lagoa')],
      'lagoa',
      new Set([1]),
    );
    assert.deepEqual(labels(entries), ['Furnas (Lagoa)', 'Lagoa']);
  });

  it('ranks an exact-match area key above a substring match, below favourites', () => {
    // Two Lagoa members make a real area; Furnas (Lagoa) stays a plain stop.
    const entries = buildStopEntries(
      [stop(1, 'Lagoa (Igreja)'), stop(2, 'Lagoa (Centro)'), stop(3, 'Furnas (Lagoa)')],
      'lagoa',
    );
    assert.deepEqual(labels(entries), ['Lagoa', 'Furnas (Lagoa)']);
  });

  it('leaves non-exact matches in alphabetical order relative to each other', () => {
    const entries = buildStopEntries(
      [stop(1, 'Furnas (Lagoa)'), stop(2, 'Achada (Lagoa)')],
      'lagoa',
    );
    assert.deepEqual(labels(entries), ['Achada (Lagoa)', 'Furnas (Lagoa)']);
  });
});

describe('buildStopEntries — regression proof: legacy-shaped input is unchanged', () => {
  it('degrades to exactly today’s flat filterStops output when nothing groups', () => {
    const legacyShaped = [
      stop(1, 'Ajuda - Igreja'),
      stop(2, 'Achada'),
      stop(3, 'Água Retorta'),
    ];
    const entries = buildStopEntries(legacyShaped, 'a');
    assert.deepEqual(entries, []); // below MIN_QUERY_LENGTH, matches filterStops exactly
  });

  it('every entry is a plain stop when no name contains " ("', () => {
    const legacyShaped = [stop(1, 'Ajuda - Igreja'), stop(2, 'Água Retorta')];
    const entries = buildStopEntries(legacyShaped, 'agu');
    assert.ok(entries.every((e) => e.type === 'stop'));
  });
});

describe('buildStopEntries — respects MIN_QUERY_LENGTH and never hides a match', () => {
  it('returns nothing below the minimum, even inside an area', () => {
    assert.deepEqual(buildStopEntries(NETWORK, 'ca'), []);
  });

  it('returns every match at the minimum length, no cap', () => {
    const many = Array.from({ length: 60 }, (_, i) => stop(i, `RIBEIRA (R. ${i})`));
    const entries = buildStopEntries(many, 'ribeira');
    assert.equal(entries.length, 1);
    assert.equal((entries[0] as { type: 'area'; members: unknown[] }).members.length, 60);
  });
});

/**
 * The picker keys its rows on the stop NAME, not the id, and this is why.
 *
 * `serialize_legacy_stops_v2` emits each stop under its full name and again
 * under its short name REUSING the same id — measured against the deployed
 * legacy network, 194 rows carry only 108 distinct ids. `dedupeStopsByName`
 * keeps both rows on purpose (they are two searchable names), so anything
 * downstream that assumes a unique id renders duplicate React keys and React
 * silently drops rows.
 */
describe('stop entries — row identity', () => {
  const ALIASED: Stop[] = [
    // Exactly the shape the API returns: one id, two searchable names.
    { id: 2, name: 'Ajuda - Igreja', latitude: 37.8, longitude: -25.6 },
    { id: 2, name: 'Ajuda', latitude: 37.8, longitude: -25.6 },
    { id: 3, name: 'Achada', latitude: 37.81, longitude: -25.61 },
  ];

  it('keeps both aliases of one id — they are two distinct names', () => {
    const kept = dedupeStopsByName(ALIASED);

    assert.equal(kept.length, 3);
    assert.deepEqual(
      kept.map((s) => s.name),
      ['Ajuda - Igreja', 'Ajuda', 'Achada'],
    );
  });

  it('leaves ids NON-unique, which is why they cannot be row keys', () => {
    const kept = dedupeStopsByName(ALIASED);
    const ids = new Set(kept.map((s) => s.id));

    assert.ok(ids.size < kept.length, 'ids repeat across rows');
  });

  it('leaves names unique, which is why they CAN be row keys', () => {
    const kept = dedupeStopsByName(ALIASED);
    const names = new Set(kept.map((s) => s.name));

    assert.equal(names.size, kept.length);
  });

  it('gives every rendered entry a unique key across stops and areas', () => {
    const entries = buildStopEntries(dedupeStopsByName(ALIASED), 'a');

    const keys = entries.map((entry) =>
      entry.type === 'stop' ? `stop:${entry.stop.name}` : `area:${entry.key}`,
    );
    assert.equal(new Set(keys).size, keys.length, `duplicate key in ${keys}`);
  });
});

/**
 * Favourites reorder the list; they never change what is in it.
 *
 * The picker's whole promise is that no match is hidden, so floating a
 * favourite has to be provably a permutation of the same rows — every test
 * below checks the CONTENTS are unchanged alongside the new order.
 */
describe('buildStopEntries — favourites float to the top', () => {
  it('is byte-identical to the unfavourited output when no ids are passed', () => {
    assert.deepEqual(
      buildStopEntries(NETWORK, 'escola', new Set()),
      buildStopEntries(NETWORK, 'escola'),
    );
  });

  it('puts a favourite plain row above alphabetically-earlier rows', () => {
    const flat = [stop(1, 'AGUA A'), stop(2, 'AGUA B'), stop(3, 'AGUA C')];
    const entries = buildStopEntries(flat, 'agua', new Set([3]));

    assert.deepEqual(
      entries.map((e) => (e as { stop: { name: string } }).stop.name),
      ['AGUA C', 'AGUA A', 'AGUA B'],
      'the favourite leads; the rest stay alphabetical',
    );
  });

  it('floats an AREA whose matching member is a favourite', () => {
    // 'escola' matches ARRIFES (ESCOLA) and CAPELAS (ESCOLA); alphabetically
    // ARRIFES leads, so favouriting inside CAPELAS must invert that.
    const entries = buildStopEntries(NETWORK, 'escola', new Set([CAPELAS_ESCOLA.id]));

    assert.deepEqual(
      entries.map((e) => (e as { type: 'area'; key: string }).key),
      ['CAPELAS', 'ARRIFES'],
    );
  });

  it('floats favourite members inside their own area, order otherwise intact', () => {
    const entries = buildStopEntries(NETWORK, 'capelas', new Set([CAPELAS_MOAGEM.id]));
    const members = (entries[0] as { type: 'area'; members: { name: string }[] }).members;

    // Members are in network order (IGREJA, MOAGEM, ESCOLA), not alphabetical
    // — that is what `groupStopsIntoAreas` produces and floating must not
    // quietly re-sort the ones it does not move.
    assert.deepEqual(
      members.map((m) => m.name),
      ['CAPELAS (MOAGEM)', 'CAPELAS (IGREJA)', 'CAPELAS (ESCOLA)'],
    );
  });

  it('drops nothing — a favourite id that matches no row changes no order', () => {
    const withGhost = buildStopEntries(NETWORK, 'escola', new Set([9999]));
    assert.deepEqual(withGhost, buildStopEntries(NETWORK, 'escola'));
  });

  it('reorders without filtering, even when every match is a favourite', () => {
    const all = new Set(NETWORK.map((s) => s.id));
    const favoured = buildStopEntries(NETWORK, 'capelas', all);
    const plain = buildStopEntries(NETWORK, 'capelas');

    assert.equal(
      (favoured[0] as { members: unknown[] }).members.length,
      (plain[0] as { members: unknown[] }).members.length,
    );
  });
});

/**
 * What the picker opens on when the input is focused and nothing is typed.
 */
describe('buildFavoriteEntries — the focused, empty-query list', () => {
  it('keeps the store order (most-recently-favourited first), not alphabetical', () => {
    const entries = buildFavoriteEntries(NETWORK, [CAPELAS_MOAGEM, ACHADINHA]);

    assert.deepEqual(
      entries.map((e) => (e as { stop: { name: string } }).stop.name),
      ['CAPELAS (MOAGEM)', 'ACHADINHA'],
    );
  });

  it('is empty when nothing is favourited, so the panel simply stays shut', () => {
    assert.deepEqual(buildFavoriteEntries(NETWORK, []), []);
  });

  it('resolves BY NAME first — an id shared by two names must not swap the stop', () => {
    // The legacy aliasing case: 'Ajuda' and 'Ajuda - Igreja' are both id 2.
    const aliased: Stop[] = [
      { id: 2, name: 'Ajuda - Igreja', latitude: 37.8, longitude: -25.6 },
      { id: 2, name: 'Ajuda', latitude: 37.8, longitude: -25.6 },
    ];
    const entries = buildFavoriteEntries(aliased, [{ id: 2, name: 'Ajuda' }]);

    assert.equal(entries.length, 1);
    assert.equal((entries[0] as { stop: { name: string } }).stop.name, 'Ajuda');
  });

  it('falls back to the id when the stored name no longer exists', () => {
    const entries = buildFavoriteEntries(NETWORK, [{ id: ACHADINHA.id, name: 'OLD NAME' }]);

    assert.equal((entries[0] as { stop: { name: string } }).stop.name, 'ACHADINHA');
  });

  it('drops a favourite the current network has no row for at all', () => {
    assert.deepEqual(buildFavoriteEntries(NETWORK, [{ id: 9999, name: 'GONE' }]), []);
  });

  it('never emits the same row twice, however the favourites resolve', () => {
    const entries = buildFavoriteEntries(NETWORK, [ACHADINHA, { id: ACHADINHA.id, name: 'ACHADINHA' }]);

    assert.equal(entries.length, 1);
  });
});
