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

import { buildStopEntries } from '@/lib/stop-search';

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
