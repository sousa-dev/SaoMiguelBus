import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  flattenStopEntries,
  rowIndexOfStop,
  stopsOfRows,
} from '@/lib/stop-section-rows';
import type { StopListEntry } from '@/lib/stop-search';

type S = { id: number; name: string };

const capelas: S[] = [
  { id: 1, name: 'Capelas (Igreja)' },
  { id: 2, name: 'Capelas (Escola)' },
];
const entries: StopListEntry<S>[] = [
  { type: 'area', key: 'Capelas', members: capelas },
  { type: 'stop', stop: { id: 3, name: 'Lagoa' } },
];

describe('flattenStopEntries', () => {
  it('puts a header above its members and indents them', () => {
    const rows = flattenStopEntries(entries, new Set());
    assert.deepEqual(
      rows.map((r) => (r.kind === 'area' ? `#${r.key}` : `${r.stop.name}${r.indented ? '*' : ''}`)),
      ['#Capelas', 'Capelas (Igreja)*', 'Capelas (Escola)*', 'Lagoa'],
    );
  });

  it('reports how many stops a section holds', () => {
    const [header] = flattenStopEntries(entries, new Set());
    assert.equal(header.kind === 'area' && header.count, 2);
  });

  it('drops members when collapsed but keeps the header in place', () => {
    // The section must not move under the finger that just collapsed it.
    const rows = flattenStopEntries(entries, new Set(['Capelas']));
    assert.deepEqual(
      rows.map((r) => (r.kind === 'area' ? `#${r.key}` : r.stop.name)),
      ['#Capelas', 'Lagoa'],
    );
    assert.equal(rows[0].kind === 'area' && rows[0].collapsed, true);
  });

  it('is empty for no entries', () => {
    assert.deepEqual(flattenStopEntries([], new Set()), []);
  });
});

describe('stopsOfRows', () => {
  it('is the stepping sequence, headers removed', () => {
    const rows = flattenStopEntries(entries, new Set());
    assert.deepEqual(stopsOfRows(rows).map((s) => s.id), [1, 2, 3]);
  });

  it('shrinks with a collapsed section, so arrows skip what is hidden', () => {
    const rows = flattenStopEntries(entries, new Set(['Capelas']));
    assert.deepEqual(stopsOfRows(rows).map((s) => s.id), [3]);
  });
});

describe('rowIndexOfStop', () => {
  it('accounts for the header rows above it', () => {
    // Stop id 3 is the third STOP but the fourth ROW — using the stop index
    // for scrollToIndex would land a row short for every section above it.
    const rows = flattenStopEntries(entries, new Set());
    assert.equal(rowIndexOfStop(rows, (s) => s.id === 3), 3);
    assert.equal(rowIndexOfStop(rows, (s) => s.id === 1), 1);
  });

  it('is -1 for a stop that is not rendered', () => {
    const rows = flattenStopEntries(entries, new Set(['Capelas']));
    assert.equal(rowIndexOfStop(rows, (s) => s.id === 1), -1);
  });
});
