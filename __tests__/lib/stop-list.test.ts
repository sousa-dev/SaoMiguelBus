/**
 * A stop is only ever suppressed from the picker for sharing a NAME with one
 * already listed. Never for being close to another stop.
 *
 * `serialize_legacy_stops_v2` emits every stop under its full name and then a
 * second row per distinct short name ("Ajuda" for "Ajuda - Igreja"), reusing the
 * same stop id. Deduping by id therefore dropped 13 genuinely distinct,
 * searchable names on the legacy network — they were unique names, and unique
 * names must survive.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { dedupeStopsByName } from '@/lib/stop-list';

const AJUDA = { id: 5, name: 'Ajuda - Igreja', latitude: 37.8, longitude: -25.5 };
const AJUDA_SHORT = { id: 5, name: 'Ajuda', latitude: 37.8, longitude: -25.5 };

describe('dedupeStopsByName', () => {
  it('keeps a short-name alias — it is a distinct name the user can search', () => {
    const kept = dedupeStopsByName([AJUDA, AJUDA_SHORT]);
    assert.equal(kept.length, 2);
    assert.deepEqual(kept.map((s) => s.name), ['Ajuda - Igreja', 'Ajuda']);
  });

  it('suppresses only an exact repeat of a name already listed', () => {
    const kept = dedupeStopsByName([AJUDA, { ...AJUDA, id: 9 }]);
    assert.equal(kept.length, 1);
    assert.equal(kept[0].id, 5, 'the first occurrence wins');
  });

  it('NEVER suppresses two stops that are merely close together', () => {
    // 11 m apart — the median separation of a road pair — but different names.
    const a = { id: 1, name: 'COVOADA (AV. 6 DE JANEIRO)', latitude: 37.7500, longitude: -25.69 };
    const b = { id: 2, name: 'COVOADA (ESCOLA)', latitude: 37.7501, longitude: -25.69 };
    assert.equal(dedupeStopsByName([a, b]).length, 2);
  });

  it('never suppresses stops sharing coordinates exactly', () => {
    const a = { id: 1, name: 'TERMINAL (CAIS 1)', latitude: 37.74, longitude: -25.67 };
    const b = { id: 2, name: 'TERMINAL (CAIS 2)', latitude: 37.74, longitude: -25.67 };
    assert.equal(dedupeStopsByName([a, b]).length, 2);
  });

  it('treats names differing only in case or padding as the same name', () => {
    const kept = dedupeStopsByName([AJUDA, { ...AJUDA, id: 9, name: '  ajuda - igreja ' }]);
    assert.equal(kept.length, 1);
    assert.equal(kept[0].name, 'Ajuda - Igreja', 'the first spelling is the one shown');
  });

  it('keeps names that differ by accent — they are different places', () => {
    const a = { id: 1, name: 'SÃO ROQUE', latitude: 37.7, longitude: -25.6 };
    const b = { id: 2, name: 'SAO ROQUE (ESCOLA)', latitude: 37.7, longitude: -25.6 };
    assert.equal(dedupeStopsByName([a, b]).length, 2);
  });

  it('drops entries with no usable name rather than listing a blank row', () => {
    const kept = dedupeStopsByName([AJUDA, { id: 7, name: '   ', latitude: 0, longitude: 0 }]);
    assert.equal(kept.length, 1);
  });

  it('preserves API order', () => {
    const a = { id: 1, name: 'Zebra', latitude: 0, longitude: 0 };
    const b = { id: 2, name: 'Alfa', latitude: 0, longitude: 0 };
    assert.deepEqual(dedupeStopsByName([a, b]).map((s) => s.name), ['Zebra', 'Alfa']);
  });

  it('handles an empty list', () => {
    assert.deepEqual(dedupeStopsByName([]), []);
  });
});
