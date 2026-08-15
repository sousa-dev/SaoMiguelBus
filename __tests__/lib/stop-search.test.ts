/**
 * The picker filtered by substring, sorted alphabetically and cut at 40 — a rule
 * sized for the 108-stop legacy network. AzoresBus has 816 stops named
 * "VILLAGE (STREET)", so "ribeira" matches 66 and "arrifes" 47, and the cut
 * silently hid the rest with no indication anything was missing.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  STOP_SUGGESTION_LIMIT,
  foldForSearch,
  rankStopSuggestions,
} from '@/lib/stop-search';

function stop(id: number, name: string) {
  return { id, name };
}

/** Shaped like the real AzoresBus network. */
const CAPELAS = [
  stop(1, 'CAPELAS (IGREJA)'),
  stop(2, 'CAPELAS (MOAGEM)'),
  stop(3, 'CAPELAS (R. DO PORTO)'),
  stop(4, 'CAPELAS (CORREIOS)'),
  stop(5, 'VILA DE CAPELAS'),
  stop(6, 'RIBEIRA GRANDE (IGREJA)'),
];

describe('rankStopSuggestions', () => {
  it('returns every stop in a village, not the first 40 alphabetically', () => {
    const many = Array.from({ length: 66 }, (_, i) =>
      stop(i, `RIBEIRA GRANDE (R. ${String(i).padStart(2, '0')})`),
    );
    assert.equal(rankStopSuggestions(many, 'ribeira').length, 66);
  });

  it('ranks a prefix match above one buried mid-name', () => {
    const ranked = rankStopSuggestions(CAPELAS, 'capelas');
    assert.equal(ranked.length, 5);
    assert.equal(
      ranked[ranked.length - 1].name,
      'VILA DE CAPELAS',
      'the mid-name match sorts last',
    );
    assert.ok(ranked.slice(0, 4).every((s) => s.name.startsWith('CAPELAS')));
  });

  it('puts an exact name match first', () => {
    const ranked = rankStopSuggestions(
      [stop(1, 'CAPELAS (IGREJA)'), stop(2, 'CAPELAS')],
      'capelas',
    );
    assert.equal(ranked[0].name, 'CAPELAS');
  });

  it('matches without accents, so "sao" finds "SÃO"', () => {
    const ranked = rankStopSuggestions([stop(1, 'SÃO ROQUE (IGREJA)')], 'sao roque');
    assert.equal(ranked.length, 1);
  });

  it('matches accented input against accented names', () => {
    assert.equal(rankStopSuggestions([stop(1, 'SÃO ROQUE')], 'são').length, 1);
  });

  it('floats favourites above other matches, but never shows a non-match', () => {
    const ranked = rankStopSuggestions(CAPELAS, 'capelas', {
      favoriteIds: new Set([5]),
    });
    assert.equal(ranked[0].name, 'VILA DE CAPELAS', 'the favourite leads');
    assert.ok(
      !ranked.some((s) => s.name.startsWith('RIBEIRA')),
      'a favourite must not drag in an unrelated stop',
    );
  });

  it('returns the whole list, unfiltered, for an empty query', () => {
    assert.equal(rankStopSuggestions(CAPELAS, '   ').length, CAPELAS.length);
  });

  it('still caps, so a one-letter query cannot render thousands of rows', () => {
    const many = Array.from({ length: 900 }, (_, i) => stop(i, `R. ${i}`));
    assert.equal(rankStopSuggestions(many, 'r').length, STOP_SUGGESTION_LIMIT);
  });

  it('caps high enough to clear the largest real village', () => {
    // ARRIFES is the biggest at 47 stops; RIBEIRA matches 66.
    assert.ok(STOP_SUGGESTION_LIMIT > 66);
  });

  it('returns nothing when nothing matches', () => {
    assert.deepEqual(rankStopSuggestions(CAPELAS, 'zzzz'), []);
  });
});

describe('foldForSearch', () => {
  it('folds accents and collapses whitespace', () => {
    assert.equal(foldForSearch('  SÃO   ROQUE '), 'sao roque');
  });
});
