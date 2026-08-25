/**
 * 03 §5.1-§5.2 — date-resolved offline services and the expired-bundle state.
 *
 * `services` replaces the WEEKDAY|SATURDAY|SUNDAY enum, and that is the whole
 * point: an enum cannot express line 112 (Tuesday AND Thursday only), 102's
 * distinct Wednesday and Friday extras, or 307's 33 <-> 38 school-term flip
 * (98 B0). Offline must answer "does this trip run on THIS ISO date?".
 *
 * `runsOn` mirrors `transit/services/search.py:eligible_trips` exactly, including
 * two behaviours the mobile plan's sketch got wrong — see the tests below.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  bundleFreshness,
  isBundleHolidayCoverageStale,
  offlineSearchV2,
  parseBundle,
  resolveOfflineUiState,
  runsOn,
  shouldDowngradeToV1,
  type OfflineBundleV2,
} from '@/lib/offline-bundle-v2';

function bundle(overrides: Partial<OfflineBundleV2> = {}): OfflineBundleV2 {
  return {
    schema: 2,
    version: 'v2test',
    generatedAt: '2026-08-20T03:41:09Z',
    island: 'sao-miguel',
    dataset: 'azoresbus',
    cutoverAt: '2026-09-01T00:00:00+00:00',
    nextTransitionAt: '2026-10-01T00:00:00+00:00',
    phase: 'live',
    holidays: [
      { date: '2026-12-08', name: 'Imaculada Conceição' },
      { date: '2027-01-01', name: 'Ano Novo' },
    ],
    stops: [
      { id: 1, name: 'PONTA DELGADA (ALFÂNDEGA)', latitude: 37.73, longitude: -25.67 },
      { id: 2, name: 'ARRIFES (R. DOS VALADOS)', latitude: 37.76, longitude: -25.66 },
      { id: 3, name: 'LAGOA (IGREJA)', latitude: 37.74, longitude: -25.57 },
    ],
    services: {
      everyday: { days: '1111111', from: null, to: null, added: [], removed: [] },
      // Line 112 is Tuesday and Thursday only (98 B0) — unrepresentable as an enum.
      'school-112': { days: '0101000', from: '2026-09-14', to: null, added: [], removed: [] },
      // Line 307's extra school runs, bounded to the term.
      'term-307': { days: '1111100', from: '2026-09-14', to: '2027-06-18', added: [], removed: [] },
    },
    routes: [],
    ...overrides,
  };
}

const MONDAY = '2026-09-14';
const TUESDAY = '2026-09-15';
const SATURDAY = '2026-09-19';
const SUNDAY = '2026-09-20';
const SUMMER = '2027-07-12';

function row(service: string | null) {
  return {
    id: 1, line: '112', service,
    stops: [0, 1], codes: ['1002', '1044'], times: [26100, 26400], offsets: [0, 0],
  };
}

describe('runsOn — per-weekday services (98 B0)', () => {
  const b = bundle();

  it('runs line 112 on a Tuesday and not on a Monday', () => {
    assert.equal(runsOn(b, row('school-112'), TUESDAY), true);
    assert.equal(runsOn(b, row('school-112'), MONDAY), false);
  });

  it('honours the start of a seasonal window', () => {
    assert.equal(runsOn(b, row('school-112'), '2026-09-08'), false, 'before the term');
    assert.equal(runsOn(b, row('school-112'), TUESDAY), true);
  });

  it('honours the end of a seasonal window — 307 in summer', () => {
    assert.equal(runsOn(b, row('term-307'), MONDAY), true);
    assert.equal(runsOn(b, row('term-307'), SUMMER), false, 'the school runs are gone');
  });

  it('runs an everyday service on every weekday', () => {
    for (const date of [MONDAY, TUESDAY, SATURDAY, SUNDAY]) {
      assert.equal(runsOn(b, row('everyday'), date), true, date);
    }
  });

  it('drops a row whose service key is missing rather than guessing', () => {
    assert.equal(runsOn(b, row('no-such-service'), MONDAY), false);
    assert.equal(runsOn(b, row(null), MONDAY), false);
  });
});

describe('runsOn — holidays resolve to Sunday, exactly as the server does', () => {
  const b = bundle();

  it('serves the Sunday set on a holiday Tuesday', () => {
    // 2026-12-08 is a Tuesday and a confirmed holiday (98 claim 10).
    assert.equal(runsOn(b, row('everyday'), '2026-12-08'), true);
    assert.equal(
      runsOn(b, row('school-112'), '2026-12-08'),
      false,
      '112 does not run on Sundays, so it does not run on a holiday',
    );
  });

  it('ignores date bounds on a holiday, as search.py does', () => {
    // search.py sets on_date = None for a holiday, so eligible_trips filters on
    // the Sunday flag ALONE — no start_date/end_date, no exceptions. Mirroring
    // it matters more than "correctness": online and offline must agree.
    const sundayOutOfSeason = bundle({
      services: {
        winter: { days: '0000001', from: '2027-01-01', to: '2027-03-01', added: [], removed: [] },
      },
    });
    assert.equal(runsOn(sundayOutOfSeason, row('winter'), '2026-12-08'), true);
  });

  it('does not shift the holiday a day, west of UTC or otherwise', () => {
    assert.equal(runsOn(b, row('school-112'), '2026-12-07'), false, 'a plain Monday');
  });
});

describe('runsOn — exceptions', () => {
  it('a REMOVED date forces the service off', () => {
    const b = bundle({
      services: {
        everyday: { days: '1111111', from: null, to: null, added: [], removed: [MONDAY] },
      },
    });
    assert.equal(runsOn(b, row('everyday'), MONDAY), false);
    assert.equal(runsOn(b, row('everyday'), TUESDAY), true);
  });

  it('an ADDED date does NOT force the service on — the server ignores it too', () => {
    // eligible_trips only excludes REMOVED; it never adds. 03 §5.1's sketch
    // returns true for `added`, which would make offline more permissive than
    // online on exactly the dates nobody would think to check.
    const b = bundle({
      services: {
        weekdaysOnly: { days: '1111100', from: null, to: null, added: [SUNDAY], removed: [] },
      },
    });
    assert.equal(runsOn(b, row('weekdaysOnly'), SUNDAY), false);
  });
});

describe('offlineSearchV2 — date-resolved, sequence-matched', () => {
  const loop = {
    id: 488, line: '301', service: 'everyday',
    // ALFÂNDEGA (stop 0) opens and closes the loop, exactly like line 301.
    stops: [0, 2, 1, 0],
    codes: ['1001', '3001', '1192', '1002'],
    times: [23400, 24000, 25409, 26700],
    offsets: [0, 0, 0, 0],
  };
  const b = bundle({ routes: [loop] });

  it('returns the later leg of a loop instead of discarding it (98 B7)', () => {
    const results = offlineSearchV2(b, {
      origin: 'ARRIFES (R. DOS VALADOS)',
      destination: 'PONTA DELGADA (ALFÂNDEGA)',
      isoDate: MONDAY,
    });
    assert.equal(results.length, 1);
    assert.equal(results[0].start, '07h03');
    assert.equal(results[0].end, '07h25');
    assert.equal(results[0].boarding?.sequence, 3);
    assert.equal(results[0].alighting?.sequence, 4);
  });

  it('carries the pole code so a result can show which side of the road', () => {
    const results = offlineSearchV2(b, {
      origin: 'ARRIFES (R. DOS VALADOS)',
      destination: 'PONTA DELGADA (ALFÂNDEGA)',
      isoDate: MONDAY,
    });
    assert.equal(results[0].boarding?.code, '1192');
    assert.equal(results[0].alighting?.code, '1002');
  });

  it('returns nothing on a date the service does not run', () => {
    const school = bundle({ routes: [{ ...loop, service: 'school-112' }] });
    assert.deepEqual(
      offlineSearchV2(school, {
        origin: 'ARRIFES (R. DOS VALADOS)',
        destination: 'PONTA DELGADA (ALFÂNDEGA)',
        isoDate: MONDAY,
      }),
      [],
    );
    assert.equal(
      offlineSearchV2(school, {
        origin: 'ARRIFES (R. DOS VALADOS)',
        destination: 'PONTA DELGADA (ALFÂNDEGA)',
        isoDate: TUESDAY,
      }).length,
      1,
    );
  });

  it('renders a wrapped night leg with a positive duration and a +1 alight', () => {
    const night = {
      id: 984, line: 'N03', service: 'everyday',
      stops: [0, 1], codes: ['1001', '1192'],
      times: [83700, 600], offsets: [0, 1],
    };
    const results = offlineSearchV2(bundle({ routes: [night] }), {
      origin: 'PONTA DELGADA (ALFÂNDEGA)',
      destination: 'ARRIFES (R. DOS VALADOS)',
      isoDate: MONDAY,
    });
    assert.equal(results[0].start, '23h15');
    assert.equal(results[0].end, '00h10');
    assert.equal(results[0].alighting?.dayOffset, 1, 'the +1 badge comes from here');
  });

  it('tolerates a null stop index without crashing', () => {
    const broken = { ...loop, stops: [0, null, 1, 0] as (number | null)[] };
    const results = offlineSearchV2(bundle({ routes: [broken] }), {
      origin: 'ARRIFES (R. DOS VALADOS)',
      destination: 'PONTA DELGADA (ALFÂNDEGA)',
      isoDate: MONDAY,
    });
    assert.equal(results.length, 1);
  });
});

/**
 * Offline has no server to ask, so it must resolve "Capelas" to the whole
 * village itself — the online path just sends the raw text to
 * /api/v3/transit/search, which does its own identical union server-side.
 * `resolveKeys` mirrors that server-side precedence (exact match first) using
 * the SAME lib/stop-areas.ts module the picker's sections use.
 *
 * Fixture design note, same reasoning as the backend's end-to-end test: the
 * route under test serves CAPELAS (MOAGEM), not CAPELAS (ESCOLA) — which
 * sorts first alphabetically. Offline has no prefix fallback to accidentally
 * mask a broken area lookup the way the backend's startswith fallback could,
 * but keeping the fixture non-alphabetically-first costs nothing and rules
 * out a coincidental pass either way.
 */
describe('offlineSearchV2 — village area search (AzoresBus only, data-gated)', () => {
  const areaBundle = bundle({
    stops: [
      { id: 1, name: 'CAPELAS (ESCOLA)', latitude: 37.79, longitude: -25.7 },
      { id: 2, name: 'CAPELAS (IGREJA)', latitude: 37.8, longitude: -25.71 },
      { id: 3, name: 'CAPELAS (MOAGEM)', latitude: 37.81, longitude: -25.72 },
      { id: 4, name: 'PONTA DELGADA (ALFÂNDEGA)', latitude: 37.73, longitude: -25.67 },
      { id: 5, name: 'ARRIFES (ESCOLA)', latitude: 37.76, longitude: -25.66 },
    ],
  });

  it('finds a trip via a non-alphabetically-first member of the village', () => {
    const onMoagem = {
      id: 1, line: 'L1', service: 'everyday',
      stops: [2, 3], codes: [null, null], times: [25200, 27000], offsets: [0, 0],
    };
    const results = offlineSearchV2(
      { ...areaBundle, routes: [onMoagem] },
      { origin: 'Capelas', destination: 'Ponta Delgada (Alfândega)', isoDate: MONDAY },
    );
    assert.equal(results.length, 1);
    assert.equal(results[0].start, '07h00');
  });

  it('does not match a trip entirely outside the village', () => {
    const onArrifes = {
      id: 2, line: 'L2', service: 'everyday',
      stops: [4, 3], codes: [null, null], times: [25200, 27000], offsets: [0, 0],
    };
    assert.deepEqual(
      offlineSearchV2(
        { ...areaBundle, routes: [onArrifes] },
        { origin: 'Capelas', destination: 'Ponta Delgada (Alfândega)', isoDate: MONDAY },
      ),
      [],
    );
  });

  it('an exact stop name still wins over the area it belongs to', () => {
    const onEscolaOnly = {
      id: 3, line: 'L3', service: 'everyday',
      stops: [0, 3], codes: [null, null], times: [25200, 27000], offsets: [0, 0],
    };
    const onMoagemOnly = {
      id: 4, line: 'L4', service: 'everyday',
      stops: [2, 3], codes: [null, null], times: [30000, 31000], offsets: [0, 0],
    };
    const results = offlineSearchV2(
      { ...areaBundle, routes: [onEscolaOnly, onMoagemOnly] },
      { origin: 'CAPELAS (ESCOLA)', destination: 'Ponta Delgada (Alfândega)', isoDate: MONDAY },
    );
    assert.equal(results.length, 1, 'only the trip actually serving that ONE stop');
    assert.equal(results[0].start, '07h00');
  });

  it('a legacy-shaped bundle (no groupable names) is unaffected — data-gated, not flag-gated', () => {
    const legacyBundle = bundle({
      dataset: 'legacy',
      stops: [
        { id: 1, name: 'Capelas - Navio', latitude: 0, longitude: 0 },
        { id: 2, name: 'Capelas - Rossio', latitude: 0, longitude: 0 },
        { id: 3, name: 'Ponta Delgada', latitude: 0, longitude: 0 },
      ],
      routes: [
        {
          id: 5, line: 'L5', service: 'everyday',
          stops: [0, 2], codes: [null, null], times: [25200, 27000], offsets: [0, 0],
        },
      ],
    });
    // No bare "Capelas" stop and no " (" convention -- nothing groups, so
    // "Capelas" resolves to nothing (offline has no prefix fallback either).
    assert.deepEqual(
      offlineSearchV2(legacyBundle, {
        origin: 'Capelas', destination: 'Ponta Delgada', isoDate: MONDAY,
      }),
      [],
    );
  });
});

describe('bundleFreshness — 03 §5.2', () => {
  const past = Date.parse('2026-09-02T00:00:00Z');
  const before = Date.parse('2026-08-20T00:00:00Z');

  it('a legacy bundle past the cutover has expired', () => {
    assert.equal(bundleFreshness(bundle({ dataset: 'legacy' }), past), 'expired');
  });

  it('a legacy bundle before the cutover is fresh', () => {
    assert.equal(bundleFreshness(bundle({ dataset: 'legacy' }), before), 'fresh');
  });

  it('an azoresbus bundle past the cutover is fresh', () => {
    assert.equal(bundleFreshness(bundle({ dataset: 'azoresbus' }), past), 'fresh');
  });

  it('a bundle with no cutover armed is fresh — production today', () => {
    assert.equal(
      bundleFreshness(bundle({ dataset: 'legacy', cutoverAt: null }), past),
      'fresh',
    );
  });

  it('compares instants, not local dates', () => {
    // 22:30 Azores on 31 August is 23:30 in Lisbon. A tourist whose phone is
    // still on WEST must not see the bundle expire an hour early.
    const lisbonNight = Date.parse('2026-08-31T22:30:00Z');
    assert.equal(bundleFreshness(bundle({ dataset: 'legacy' }), lisbonNight), 'fresh');
    assert.equal(
      bundleFreshness(bundle({ dataset: 'legacy' }), Date.parse('2026-09-01T00:30:00Z')),
      'expired',
    );
  });
});

describe('bundle holiday coverage', () => {
  it('accepts a bundle whose holidays span the dates the services cover', () => {
    assert.equal(isBundleHolidayCoverageStale(bundle(), Date.parse('2026-09-15T00:00:00Z')), false);
  });

  it('rejects a bundle whose holidays stop in 2025 — the production gap', () => {
    const stale = bundle({ holidays: [{ date: '2025-06-19', name: 'Antigo' }] });
    assert.equal(isBundleHolidayCoverageStale(stale, Date.parse('2026-09-15T00:00:00Z')), true);
  });

  it('rejects a bundle with no holidays at all', () => {
    assert.equal(
      isBundleHolidayCoverageStale(bundle({ holidays: [] }), Date.parse('2026-09-15T00:00:00Z')),
      true,
    );
  });
});

describe('parseBundle — a bad payload must never replace a good one', () => {
  const good = JSON.stringify(bundle());

  it('accepts a well-formed bundle', () => {
    assert.equal(parseBundle(good)?.version, 'v2test');
  });

  it('rejects truncated JSON', () => {
    assert.equal(parseBundle(good.slice(0, good.length / 2)), null);
  });

  it('rejects a payload of the wrong schema', () => {
    assert.equal(parseBundle(JSON.stringify({ ...bundle(), schema: 1 })), null);
  });

  it('rejects a payload missing the parts search needs', () => {
    const { services, ...withoutServices } = bundle();
    assert.equal(parseBundle(JSON.stringify(withoutServices)), null);
    assert.equal(parseBundle(JSON.stringify({ ...bundle(), routes: null })), null);
    assert.equal(parseBundle(JSON.stringify({ ...bundle(), holidays: null })), null);
  });

  it('rejects an empty body', () => {
    assert.equal(parseBundle(''), null);
  });
});

describe('resolveOfflineUiState — 03 §5.2', () => {
  const past = Date.parse('2026-09-02T00:00:00Z');
  const routes = [row('everyday')];

  it('hides expired results behind the panel rather than filtering them', () => {
    const stale = bundle({ dataset: 'legacy', routes });
    assert.equal(resolveOfflineUiState(stale, { now: past }), 'expired');
  });

  it('"show anyway" reveals them', () => {
    const stale = bundle({ dataset: 'legacy', routes });
    assert.equal(resolveOfflineUiState(stale, { now: past, showAnyway: true }), 'ready');
  });

  it('a current bundle is simply ready', () => {
    assert.equal(resolveOfflineUiState(bundle({ routes }), { now: past }), 'ready');
  });

  it('no bundle, or an empty one, is empty rather than expired', () => {
    assert.equal(resolveOfflineUiState(null, { now: past }), 'empty');
    assert.equal(
      resolveOfflineUiState(bundle({ dataset: 'legacy', routes: [] }), { now: past }),
      'empty',
    );
  });
});

describe('shouldDowngradeToV1 — 98 B3, narrow the fallback', () => {
  it('downgrades when the endpoint is genuinely absent', () => {
    assert.equal(shouldDowngradeToV1({ status: 404 }), true);
    assert.equal(shouldDowngradeToV1({ status: 501 }), true);
  });

  it('does NOT downgrade on a server error', () => {
    assert.equal(shouldDowngradeToV1({ status: 500 }), false);
    assert.equal(shouldDowngradeToV1({ status: 503 }), false);
  });

  it('does NOT downgrade on a parse failure or a network drop', () => {
    assert.equal(shouldDowngradeToV1(new SyntaxError('Unexpected token')), false);
    assert.equal(shouldDowngradeToV1(new TypeError('Network request failed')), false);
  });

  it('does NOT downgrade on an unrecognised error', () => {
    assert.equal(shouldDowngradeToV1(undefined), false);
  });
});
