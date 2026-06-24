import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatCirculationRows } from '@/features/minibus/lib/liveEtas';
import type { MinibusCirculation } from '@/lib/types';

const t = {
  now: 'Now',
  minutes: (count: number) => `${count} min`,
  unavailable: '—',
};

describe('formatCirculationRows', () => {
  it('returns empty list for missing circulations', () => {
    assert.deepEqual(formatCirculationRows(undefined, 10, t), []);
  });

  it('sorts by sequence and formats ETAs', () => {
    const circulations: MinibusCirculation[] = [
      {
        sequence: 12,
        stage: { name: 'RUA ILHA DE SÃO JORGE', nameShort: 'B 12' },
        dueInMinutes: 5,
      },
      {
        sequence: 10,
        stage: { name: 'CAMINHO DA LEVADA', nameShort: 'B 10' },
        dueInMinutes: 0,
      },
    ];

    const rows = formatCirculationRows(circulations, 10, t);
    assert.equal(rows[0].sequence, 10);
    assert.equal(rows[0].stopName, 'Caminho da Levada');
    assert.equal(rows[0].stopCode, 'B 10');
    assert.equal(rows[0].etaLabel, 'Now');
    assert.equal(rows[0].isCurrent, true);
    assert.equal(rows[1].sequence, 12);
    assert.equal(rows[1].stopName, 'Rua Ilha de São Jorge');
    assert.equal(rows[1].stopCode, 'B 12');
    assert.equal(rows[1].etaLabel, '5 min');
    assert.equal(rows[1].isCurrent, false);
  });

  it('falls back to stop code when upstream name is missing', () => {
    const rows = formatCirculationRows(
      [{ sequence: 3, stage: { nameShort: 'B 03' }, dueInMinutes: 2 }],
      null,
      t,
    );
    assert.equal(rows[0].stopName, 'B 03');
    assert.equal(rows[0].stopCode, null);
  });

  it('title-cases upstream all-caps stop names', () => {
    const rows = formatCirculationRows(
      [
        {
          sequence: 17,
          stage: { name: 'RUA ARCANJO LAR (IGREJA N. S. FÁTIMA)', nameShort: 'B 17' },
          dueInMinutes: 16,
        },
      ],
      null,
      t,
    );
    assert.equal(rows[0].stopName, 'Rua Arcanjo Lar (Igreja N. S. Fátima)');
  });

  it('preserves roman numerals in stop names', () => {
    const rows = formatCirculationRows(
      [
        {
          sequence: 4,
          stage: { name: 'AVENIDA D. JOÃO III - 1', nameShort: 'B 04' },
          dueInMinutes: 0,
        },
        {
          sequence: 5,
          stage: { name: 'AVENIDA D. JOÃO III - 2', nameShort: 'B 05' },
          dueInMinutes: 1,
        },
      ],
      null,
      t,
    );
    assert.equal(rows[0].stopName, 'Avenida D. João III - 1');
    assert.equal(rows[1].stopName, 'Avenida D. João III - 2');
  });

  it('shows Now only for the current stop when past stops lack dueInMinutes', () => {
    const circulations: MinibusCirculation[] = [
      { sequence: 13, stage: { nameShort: 'D 15' } },
      { sequence: 14, stage: { nameShort: 'D 16' }, dueInMinutes: 0 },
      { sequence: 15, stage: { nameShort: 'D 17' }, dueInMinutes: 1 },
      { sequence: 16, stage: { nameShort: 'D 18' } },
    ];

    const rows = formatCirculationRows(circulations, 14, t);
    assert.equal(rows.find((row) => row.sequence === 13)?.etaLabel, '—');
    assert.equal(rows.find((row) => row.sequence === 14)?.etaLabel, 'Now');
    assert.equal(rows.find((row) => row.sequence === 15)?.etaLabel, '1 min');
    assert.equal(rows.find((row) => row.sequence === 16)?.etaLabel, '—');
  });
});
