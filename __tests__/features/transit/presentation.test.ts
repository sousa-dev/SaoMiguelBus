/**
 * 03 §5b and §6 — the pure decisions behind the boarding-pole chip, the walking
 * hint and the pricing screen. The renderers are thin readers over these, and are
 * covered by manual QA.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  arrivesNextDay,
  distanceMetres,
  poleWalkHintMetres,
  resolveAlightingPole,
  resolveBoardingPole,
} from '@/features/transit/lib/boarding-pole';
import {
  resolveTariffsState,
  tariffRenderer,
  tariffRows,
  type TariffsResponse,
} from '@/features/transit/lib/tariffs';

describe('boarding pole — 03 §5b', () => {
  const withPole = {
    boarding: { code: '1002', lat: 37.737628, lon: -25.67039, sequence: 40, dayOffset: 0 },
    alighting: { code: '5186', lat: 37.825211, lon: -25.497905, sequence: 59, dayOffset: 0 },
  };

  it('renders the code printed on the physical pole', () => {
    assert.equal(resolveBoardingPole(withPole)?.code, '1002');
    assert.equal(resolveAlightingPole(withPole)?.code, '5186');
  });

  it('renders nothing — not undefined — for a legacy result', () => {
    assert.equal(resolveBoardingPole({ boarding: undefined }), null);
    assert.equal(resolveAlightingPole({ alighting: undefined }), null);
  });

  it('renders nothing when the code is blank rather than an empty chip', () => {
    const blank = { boarding: { code: '', lat: 0, lon: 0, sequence: 1, dayOffset: 0 } };
    assert.equal(resolveBoardingPole(blank), null);
  });

  it('marks a night trip that lands after midnight', () => {
    assert.equal(arrivesNextDay(withPole), false);
    assert.equal(
      arrivesNextDay({
        boarding: { code: 'a', lat: 0, lon: 0, sequence: 1, dayOffset: 0 },
        alighting: { code: 'b', lat: 0, lon: 0, sequence: 47, dayOffset: 1 },
      }),
      true,
    );
  });
});

describe('walking hint — only the groups that are actually far apart', () => {
  it('measures a known separation', () => {
    // Roughly 100 m apart along a meridian.
    const metres = distanceMetres({ lat: 37.7376, lon: -25.6704 }, { lat: 37.7385, lon: -25.6704 });
    assert.ok(metres > 90 && metres < 110, `expected ~100 m, got ${metres}`);
  });

  it('shows a hint for COVOADA, which spans 164 m', () => {
    const hint = poleWalkHintMetres([
      { lat: 37.7500, lon: -25.6900 },
      { lat: 37.7515, lon: -25.6900 },
    ]);
    assert.ok(hint && hint > 100, `expected a hint, got ${hint}`);
  });

  it('shows nothing for an ordinary 11 m road pair', () => {
    assert.equal(
      poleWalkHintMetres([
        { lat: 37.7376, lon: -25.6704 },
        { lat: 37.7377, lon: -25.6704 },
      ]),
      null,
    );
  });

  it('shows nothing for a single pole', () => {
    assert.equal(poleWalkHintMetres([{ lat: 37.7376, lon: -25.6704 }]), null);
  });
});

describe('tariffs — tables only, never a computed fare (03 §6)', () => {
  const payload: TariffsResponse = {
    effectiveDate: '2026-09-01',
    lastUpdatedAt: '2026-08-05T13:47:25Z',
    fetchedAt: '2026-08-20T04:00:00Z',
    isFuture: true,
    notes: 'Tarifário em vigor a partir de 1 de setembro.',
    infos: [],
    categories: [
      {
        name: 'Passes',
        tariffs: [
          {
            name: 'Passe Normal', note: '', fareUnitType: 'km',
            prices: [
              { band: '0 a 5', price: '31.75' },
              { band: '6 a 7', price: '35.10' },
              { band: '8', price: '38.45' },
            ],
          },
          {
            name: 'Cartão', note: 'Emissão', fareUnitType: null,
            prices: [{ band: null, price: '6.00' }],
          },
        ],
      },
    ],
  };

  it('renders a banded table when there are multiple labelled bands', () => {
    assert.equal(tariffRenderer(payload.categories[0].tariffs[0]), 'banded');
  });

  it('renders a single price when there is no band', () => {
    assert.equal(tariffRenderer(payload.categories[0].tariffs[1]), 'single');
  });

  it('keeps band labels verbatim and in payload order', () => {
    const rows = tariffRows(payload.categories[0].tariffs[0]);
    assert.deepEqual(rows.map((r) => r.band), ['0 a 5', '6 a 7', '8']);
    assert.equal(rows[0].price, '31.75', 'rendered as sent, never reformatted');
  });

  it('treats a 404 as empty, not as an error — production returns it today', () => {
    assert.equal(resolveTariffsState(null, { status: 404 }), 'empty');
  });

  it('treats a real failure as unavailable', () => {
    assert.equal(resolveTariffsState(null, { status: 500 }), 'unavailable');
    assert.equal(resolveTariffsState(null, new TypeError('Network request failed')), 'unavailable');
  });

  it('renders an empty state for an empty payload, never a fallback price', () => {
    assert.equal(resolveTariffsState({ ...payload, categories: [] }), 'empty');
    assert.equal(
      resolveTariffsState({ ...payload, categories: [{ name: 'Passes', tariffs: [] }] }),
      'empty',
    );
  });

  it('is ready when there is something to show', () => {
    assert.equal(resolveTariffsState(payload), 'ready');
  });
});

describe('no price literal anywhere in the pricing path (03 §6)', () => {
  const FILES = [
    'features/transit/lib/tariffs.ts',
    'features/transit/hooks/useTariffs.ts',
    'app/(tabs)/transit/prices.tsx',
    'features/transit/components/TariffTable.tsx',
  ];

  it('contains no currency literal', () => {
    // Every number renders from the payload. Not €7, not €31.75, not the €6 card
    // fee — a fallback price is worse than an empty state because it is wrong
    // silently.
    const currency = /(?:€|EUR\b)\s*\d|\d\s*(?:€|EUR\b)/;
    for (const file of FILES) {
      const source = readFileSync(join(process.cwd(), file), 'utf8');
      assert.equal(currency.test(source), false, `${file} contains a currency literal`);
    }
  });
});
