/**
 * The picker must never hide a stop whose name matches the query. A prior
 * version ranked matches by relevance and capped the list at 40 — sized for the
 * 108-stop legacy network — which silently dropped 26 of the 66 stops matching
 * "ribeira" on AzoresBus. Replaced with: no rank, no cap, alphabetical order,
 * gated by a minimum query length and a debounce so the network isn't refiltered
 * on every keystroke of a one-letter prefix that would match hundreds of rows.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MIN_QUERY_LENGTH,
  SEARCH_DEBOUNCE_MS,
  filterStops,
  foldForSearch,
} from '@/lib/stop-search';

function stop(id: number, name: string) {
  return { id, name };
}

const CAPELAS = [
  stop(1, 'CAPELAS (IGREJA)'),
  stop(2, 'CAPELAS (MOAGEM)'),
  stop(3, 'CAPELAS (R. DO PORTO)'),
  stop(4, 'CAPELAS (CORREIOS)'),
  stop(5, 'VILA DE CAPELAS'),
  stop(6, 'RIBEIRA GRANDE (IGREJA)'),
];

describe('filterStops — nothing a query matches is ever hidden', () => {
  it('returns every stop in a village, not the first N alphabetically', () => {
    const many = Array.from({ length: 66 }, (_, i) =>
      stop(i, `RIBEIRA GRANDE (R. ${String(i).padStart(2, '0')})`),
    );
    assert.equal(filterStops(many, 'ribeira').length, 66, 'no cap — all 66 must return');
  });

  it('has no cap even for a query matching hundreds of stops', () => {
    const many = Array.from({ length: 900 }, (_, i) => stop(i, `R. ${i} STREET`));
    assert.equal(filterStops(many, 'street').length, 900);
  });

  it('matches anywhere in the name, not only as a prefix', () => {
    const results = filterStops(CAPELAS, 'capelas');
    assert.equal(results.length, 5, 'VILA DE CAPELAS matches too, mid-name');
    assert.ok(results.some((s) => s.name === 'VILA DE CAPELAS'));
  });

  it('is strictly alphabetical, independent of where the match falls', () => {
    // VILA DE CAPELAS matches mid-name; a ranked search would have sorted it
    // last. Alphabetically it sorts by its own initial letter.
    const names = filterStops(CAPELAS, 'capelas').map((s) => s.name);
    assert.deepEqual(
      names,
      [...names].sort((a, b) => a.localeCompare(b)),
    );
  });

  it('does not float favourites — there is no favourites concept here at all', () => {
    // filterStops takes no favourite-ids parameter; order is name only.
    const names = filterStops(CAPELAS, 'capelas').map((s) => s.name);
    assert.deepEqual(names, [
      'CAPELAS (CORREIOS)',
      'CAPELAS (IGREJA)',
      'CAPELAS (MOAGEM)',
      'CAPELAS (R. DO PORTO)',
      'VILA DE CAPELAS',
    ]);
  });
});

describe('filterStops — minimum query length', () => {
  it('matches nothing below the minimum, even a real prefix', () => {
    assert.deepEqual(filterStops(CAPELAS, 'ca'), []);
    assert.equal(MIN_QUERY_LENGTH, 3, 'this test documents the current threshold');
  });

  it('matches at exactly the minimum', () => {
    assert.equal(filterStops(CAPELAS, 'cap').length, 5);
  });

  it('ignores leading and trailing whitespace when measuring the length', () => {
    assert.equal(filterStops(CAPELAS, '  cap  ').length, 5);
  });

  it('treats an empty or whitespace-only query as below the minimum', () => {
    assert.deepEqual(filterStops(CAPELAS, ''), []);
    assert.deepEqual(filterStops(CAPELAS, '   '), []);
  });
});

describe('filterStops — accent folding', () => {
  it('matches without accents, so "sao" finds "SÃO"', () => {
    assert.equal(filterStops([stop(1, 'SÃO ROQUE (IGREJA)')], 'sao roque').length, 1);
  });

  it('matches accented input against accented names', () => {
    assert.equal(filterStops([stop(1, 'SÃO ROQUE')], 'são').length, 1);
  });
});

describe('filterStops — edge cases', () => {
  it('returns nothing when nothing matches', () => {
    assert.deepEqual(filterStops(CAPELAS, 'zzzzz'), []);
  });

  it('handles an empty stop list', () => {
    assert.deepEqual(filterStops([], 'capelas'), []);
  });
});

describe('foldForSearch', () => {
  it('folds accents and collapses whitespace', () => {
    assert.equal(foldForSearch('  SÃO   ROQUE '), 'sao roque');
  });
});

describe('the debounce delay is a named constant', () => {
  it('is 300ms, as specified — wiring itself is manual QA (no component renderer)', () => {
    assert.equal(SEARCH_DEBOUNCE_MS, 300);
  });
});
