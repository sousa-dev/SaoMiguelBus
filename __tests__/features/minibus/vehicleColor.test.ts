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
  {
    code: 'C',
    slug: 'line-c',
    name: 'Line C',
    color: '#2d3276',
    sort_order: 3,
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
  it('maps Eleven Systems AVL fleet color to catalog line', () => {
    assert.equal(resolveLineForVehicle(vehicle, lines)?.code, 'B');
  });

  it('returns matching line when catalog hex colors align', () => {
    const matched: MinibusVehicleSummary = { ...vehicle, color: 'fbc707' };
    assert.equal(resolveLineForVehicle(matched, lines)?.code, 'A');
  });

  it('matches optional route code on vehicle summary', () => {
    const routed: MinibusVehicleSummary = { ...vehicle, color: '000000', route: 'C' };
    assert.equal(resolveLineForVehicle(routed, lines)?.code, 'C');
  });

  it('reads line code from upstream route detail object', () => {
    const routed: MinibusVehicleSummary = {
      ...vehicle,
      color: undefined,
      route: {
        id: '2',
        nameShort: 'B',
        color: '00964C',
      },
    };
    assert.equal(resolveLineForVehicle(routed, lines)?.code, 'B');
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

  it('filters AVL fleet colors that differ from catalog hex', () => {
    const avlFleet: MinibusVehicleSummary[] = [
      { ...vehicle, id: 'avl-a', color: 'F6BC1C' },
      { ...vehicle, id: 'avl-b', color: '00964C' },
    ];
    const filtered = filterVehiclesByLineSlug(avlFleet, lines, 'line-a');
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, 'avl-a');
  });
});
