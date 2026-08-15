/**
 * Village-level ("area") grouping — the TS mirror of
 * `azoresbus/services_stops.py`'s `derive_area_key`/`build_area_index` on the
 * API repo. Same rule, same numbers, pinned against the SAME real fixture
 * (`__tests__/fixtures/azoresbus/stops.json`, copied verbatim from the API
 * repo — never re-captured, never fetched), so the two implementations cannot
 * silently disagree without a test noticing on both sides.
 *
 * A different axis from the pole-collapse the backend does at import time
 * (1456 poles -> 816 `Stop` rows by exact name) — this groups those already-
 * collapsed 816 names by a shared VILLAGE PREFIX, for search only. Never
 * merges two real stops into one.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { deriveAreaKey, findAreaByQuery, groupStopsIntoAreas } from '@/lib/stop-areas';

interface UpstreamStop {
  id: string;
  name: string;
}

function realStopNames(): string[] {
  const raw = JSON.parse(
    readFileSync(join(process.cwd(), '__tests__', 'fixtures', 'azoresbus', 'stops.json'), 'utf8'),
  ) as UpstreamStop[];
  return [...new Set(raw.map((row) => row.name))].sort();
}

function stopsFrom(names: string[]): { id: number; name: string }[] {
  return names.map((name, index) => ({ id: index + 1, name }));
}

describe('deriveAreaKey', () => {
  it('splits on the first " ("', () => {
    assert.equal(deriveAreaKey('CAPELAS (IGREJA)'), 'CAPELAS');
  });

  it('returns null for a bare name with no parens', () => {
    assert.equal(deriveAreaKey('ACHADINHA'), null);
  });

  it('groups a trailing pole number after the closing paren', () => {
    // ARRIFES (LG. DO BOM DESPACHO) 1 / 2 -- splitting on the FIRST " (" rather
    // than requiring the string to end in ")" is what catches this.
    assert.equal(deriveAreaKey('ARRIFES (LG. DO BOM DESPACHO) 1'), 'ARRIFES');
    assert.equal(deriveAreaKey('ARRIFES (LG. DO BOM DESPACHO) 2'), 'ARRIFES');
  });

  it('trims whitespace before the paren', () => {
    assert.equal(deriveAreaKey('CAPELAS  (IGREJA)'), 'CAPELAS');
  });
});

describe('groupStopsIntoAreas — real data, pinned against the shared fixture', () => {
  const names = realStopNames();
  const stops = stopsFrom(names);
  const areas = groupStopsIntoAreas(stops);

  it('matches the backend’s real counts: 816 names, 83 areas, 765 covered', () => {
    assert.equal(names.length, 816);
    assert.equal(areas.size, 83);
    const covered = [...areas.values()].reduce((sum, members) => sum + members.length, 0);
    assert.equal(covered, 765);
  });

  it('CAPELAS has 35 members', () => {
    assert.equal(areas.get('CAPELAS')?.length, 35);
  });

  it('the largest area is ARRIFES with 47', () => {
    const [largestKey, largest] = [...areas.entries()].reduce((best, entry) =>
      entry[1].length > best[1].length ? entry : best,
    );
    assert.equal(largestKey, 'ARRIFES');
    assert.equal(largest.length, 47);
  });

  it('single-member "areas" are excluded — no grouping benefit', () => {
    assert.equal(areas.has('ACHADINHA'), false);
    assert.equal(areas.has('ALGARVIA'), false);
  });

  it('collision-excluded areas are absent: AFLITOS, VÁRZEA, ACHADINHA, ALGARVIA, RIBEIRA FUNDA', () => {
    for (const excluded of ['AFLITOS', 'VÁRZEA', 'ACHADINHA', 'ALGARVIA', 'RIBEIRA FUNDA']) {
      assert.equal(areas.has(excluded), false, excluded);
    }
  });

  it('every member actually belongs under its key', () => {
    for (const [key, members] of areas) {
      for (const member of members) {
        assert.equal(deriveAreaKey(member.name), key, member.name);
      }
    }
  });

  it('is stable across input order', () => {
    const reversed = groupStopsIntoAreas([...stops].reverse());
    assert.deepEqual(
      [...areas.keys()].sort(),
      [...reversed.keys()].sort(),
    );
    for (const key of areas.keys()) {
      assert.equal(areas.get(key)!.length, reversed.get(key)!.length, key);
    }
  });
});

describe('groupStopsIntoAreas — collision exclusion, isolated fixtures', () => {
  it('a bare stop blocks its own area key', () => {
    const areas = groupStopsIntoAreas(
      stopsFrom(['AFLITOS', 'AFLITOS (ESCOLA)', 'AFLITOS (IGREJA)']),
    );
    assert.equal(areas.has('AFLITOS'), false);
  });

  it('the exclusion is accent- and case-folded (foldStopName, not a bare match)', () => {
    const areas = groupStopsIntoAreas(
      stopsFrom(['Água Retorta', 'AGUA RETORTA (PORTO)', 'AGUA RETORTA (PRAIA)']),
    );
    assert.equal(areas.size, 0);
  });

  it('without a colliding bare stop, the area forms normally', () => {
    const areas = groupStopsIntoAreas(stopsFrom(['CAPELAS (IGREJA)', 'CAPELAS (MOAGEM)']));
    assert.equal(areas.get('CAPELAS')?.length, 2);
  });

  it('a single matching stop never forms an area', () => {
    const areas = groupStopsIntoAreas(stopsFrom(['CAPELAS (IGREJA)', 'ARRIFES (ESCOLA)']));
    assert.equal(areas.size, 0);
  });

  it('is generic over any stop-like shape — works for the offline bundle’s stop type too', () => {
    // OfflineStopV2 has no `id` collision with `Stop.id`'s type in this test,
    // just proving the function only ever touches `.name`.
    const offlineShaped = [
      { id: 1, name: 'CAPELAS (IGREJA)', latitude: 0, longitude: 0 },
      { id: 2, name: 'CAPELAS (MOAGEM)', latitude: 0, longitude: 0 },
    ];
    const areas = groupStopsIntoAreas(offlineShaped);
    assert.equal(areas.get('CAPELAS')?.length, 2);
  });
});

/**
 * `findAreaByQuery` is what OFFLINE search needs and online does not: the
 * picker only ever needs a per-STOP reverse lookup (which area, if any, does
 * this stop belong to — built once, forward, over the raw-keyed map above),
 * because tapping the area header just sends the raw text to the SERVER,
 * which already does its own resolution. Offline has no server to ask, so
 * `offlineSearchV2` must resolve a query STRING to an area itself — which
 * means folding the map's raw keys at lookup time, exactly like
 * `_resolve_stop_ids` folds them server-side.
 */
describe('findAreaByQuery — the folded lookup offline needs', () => {
  const areas = groupStopsIntoAreas(
    stopsFrom(['CAPELAS (IGREJA)', 'CAPELAS (MOAGEM)', 'ARRIFES (ESCOLA)', 'ARRIFES (IGREJA)']),
  );

  it('matches a lowercase, unaccented query against an uppercase key', () => {
    const members = findAreaByQuery(areas, 'capelas');
    assert.equal(members?.length, 2);
  });

  it('matches an accented query against an unaccented key and vice versa', () => {
    const withAccent = groupStopsIntoAreas(
      stopsFrom(['SÃO ROQUE (IGREJA)', 'SÃO ROQUE (ESCOLA)']),
    );
    assert.equal(findAreaByQuery(withAccent, 'sao roque')?.length, 2);
    assert.equal(findAreaByQuery(withAccent, 'São Roque')?.length, 2);
  });

  it('returns null for a query matching no area', () => {
    assert.equal(findAreaByQuery(areas, 'zzzz'), null);
  });

  it('returns null for a query matching a member but not the area itself', () => {
    // "Igreja" is a landmark shared by multiple villages, not an area key.
    assert.equal(findAreaByQuery(areas, 'igreja'), null);
  });
});
