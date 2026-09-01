/**
 * ETA formatting against a REAL captured response.
 *
 * The fixture is a verbatim `/api/v3/azoresbus/vehicles/<id>` body (line 110,
 * 67 stops, mid-journey at stop 37), so it carries the property that matters and
 * that a hand-written fixture would probably get wrong: upstream omits
 * `dueInMinutes` for every stop already passed. 36 of the 67 rows have no ETA at
 * all, and they still have to render as rows rather than vanishing or crashing.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { formatCirculationRows } from '@/features/live-tracking/lib/liveEtas';
import { scrollTargetIndex } from '@/features/live-tracking/lib/liveVehicleSheetScroll';
import type { AzoresbusVehicleDetail } from '@/lib/types';

const vehicle: AzoresbusVehicleDetail = JSON.parse(
  readFileSync(
    join(process.cwd(), '__tests__', 'fixtures', 'azoresbus', 'tracking_vehicle_detail.json'),
    'utf8',
  ),
);

const t = {
  now: 'Agora',
  minutes: (count: number) => `${count} min`,
  unavailable: '—',
};

const rows = formatCirculationRows(
  vehicle.journey.circulations,
  vehicle.currentStopSequence,
  t,
);

describe('azoresbus ETA rows — real payload', () => {
  it('renders a row for every stop, including the ones already passed', () => {
    assert.equal(rows.length, vehicle.journey.circulations?.length);
    assert.ok(rows.length > 50, 'fixture should be a long journey');
  });

  it('marks exactly one row as the current stop', () => {
    assert.equal(rows.filter((row) => row.isCurrent).length, 1);
  });

  it('labels the current stop "Agora"', () => {
    const current = rows.find((row) => row.isCurrent);
    assert.equal(current?.etaLabel, 'Agora');
    assert.equal(current?.sequence, vehicle.currentStopSequence);
  });

  it('gives passed stops a placeholder instead of a bogus ETA', () => {
    const passed = rows.filter((row) => row.sequence < (vehicle.currentStopSequence ?? 0));
    assert.ok(passed.length > 0);
    assert.ok(
      passed.every((row) => row.etaLabel === '—'),
      'a stop behind the bus must not claim a countdown',
    );
  });

  it('counts upcoming stops down in minutes', () => {
    const upcoming = rows.filter((row) => row.sequence > (vehicle.currentStopSequence ?? 0));
    assert.ok(upcoming.some((row) => /\d+ min|Agora/.test(row.etaLabel)));
  });

  it('title-cases the operator\'s ALL CAPS stop names', () => {
    // Upstream sends "FURNAS (CAMINHO NOVO)"; shouting at the rider is not the
    // house style, and the shared formatter handles the Portuguese particles.
    assert.ok(
      rows.every((row) => row.stopName !== row.stopName.toUpperCase() || row.stopName.length < 4),
      `found an all-caps stop name: ${rows.find((r) => r.stopName === r.stopName.toUpperCase())?.stopName}`,
    );
  });

  it('opens the sheet at the current stop, not at the top', () => {
    const index = scrollTargetIndex(rows);
    assert.equal(rows[index]?.isCurrent, true);
    assert.ok(index > 0, 'a mid-journey bus should scroll down into the list');
  });
});

describe('server-resolved stop names', () => {
  const circulations = [
    {
      sequence: 1,
      stage: {
        id: '1250',
        name: 'S. BRÁS (R. TOMÉ V. PACHECO)',
        canonicalName: 'São Brás (Rua Tomé Vaz Pacheco)',
        stopId: 4242,
      },
      dueInMinutes: 3,
    },
    // No canonicalName: this is what minibus sends, and what azoresbus sends
    // for a stop added upstream since our last sync.
    { sequence: 2, stage: { id: '9', name: 'FURNAS (CALDEIRAS)' }, dueInMinutes: 5 },
  ];

  const [resolved, unresolved] = formatCirculationRows(circulations, 1, t);

  it('prefers the server name over formatting the operator spelling', () => {
    // Title-casing would give "Tomé Vila Pacheco" -- plausible and wrong.
    assert.equal(resolved.stopName, 'São Brás (Rua Tomé Vaz Pacheco)');
    assert.doesNotMatch(resolved.stopName, /Vila/);
  });

  it('carries the stop id through so the row can be tapped', () => {
    assert.equal(resolved.stopId, 4242);
  });

  it('still formats the raw name when the server resolved nothing', () => {
    assert.equal(unresolved.stopName, 'Furnas (Caldeiras)');
    assert.equal(unresolved.stopId, null);
  });
});
