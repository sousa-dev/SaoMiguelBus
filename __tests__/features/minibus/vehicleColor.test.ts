import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  filterVehiclesByLineSlug,
  normalizeHexColor,
  resolveLineForVehicle,
  vehicleMatchesLineColor,
} from '@/features/minibus/lib/vehicleColor';
import type { MinibusLine, MinibusVehicleSummary } from '@/lib/types';

const lines: MinibusLine[] = [
  {
    code: 'A',
    slug: 'line-a',
    name: 'Line A',
    color: '#fbc707',
    sort_order: 1,
    service_summary: {},
  },
  {
    code: 'B',
    slug: 'line-b',
    name: 'Line B',
    color: '#99d420',
    sort_order: 2,
    service_summary: {},
  },
];

const vehicle: MinibusVehicleSummary = {
  id: '11010939',
  position: { lat: 37.75, lon: -25.66 },
  status: 'ontime',
  color: '00964C',
};

describe('normalizeHexColor', () => {
  it('strips hash and lowercases', () => {
    assert.equal(normalizeHexColor('#00964C'), '00964c');
    assert.equal(normalizeHexColor('00964C'), '00964c');
  });

  it('returns null for invalid input', () => {
    assert.equal(normalizeHexColor(''), null);
    assert.equal(normalizeHexColor('abc'), null);
  });
});

describe('vehicleMatchesLineColor', () => {
  it('matches normalized hex values', () => {
    assert.equal(vehicleMatchesLineColor('00964C', '#00964c'), true);
  });

  it('does not match unrelated catalog colors', () => {
    assert.equal(vehicleMatchesLineColor('00964C', '#99d420'), false);
  });
});

describe('resolveLineForVehicle', () => {
  it('returns null when no line matches upstream color', () => {
    assert.equal(resolveLineForVehicle(vehicle, lines), null);
  });

  it('returns matching line when colors align', () => {
    const matched: MinibusVehicleSummary = { ...vehicle, color: 'fbc707' };
    assert.equal(resolveLineForVehicle(matched, lines)?.code, 'A');
  });
});

describe('filterVehiclesByLineSlug', () => {
  const fleet: MinibusVehicleSummary[] = [
    { ...vehicle, id: '1', color: 'fbc707' },
    { ...vehicle, id: '2', color: '99d420' },
  ];

  it('returns all vehicles when slug is null', () => {
    assert.equal(filterVehiclesByLineSlug(fleet, lines, null).length, 2);
  });

  it('filters by line slug color', () => {
    const filtered = filterVehiclesByLineSlug(fleet, lines, 'line-b');
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, '2');
  });
});
