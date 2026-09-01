import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  azoresbusColorHex,
  azoresbusFleetLines,
  azoresbusVehicleLineCode,
  compareLineCodes,
  filterVehiclesByLineCodes,
  toggleLineCode,
} from '@/features/azoresbus/lib/vehicleLine';
import type { AzoresbusVehicleSummary } from '@/lib/types';

const route = (id: string, nameShort: string, name = `Line ${nameShort}`, color = '2D59A9') => ({
  id,
  nameShort,
  name,
  color,
});

const vehicle = (
  id: string,
  routeValue: ReturnType<typeof route> | null,
): AzoresbusVehicleSummary => ({
  id,
  position: { lat: 37.74, lon: -25.66 },
  status: 'ontime',
  busStatus: 'inTransitTo',
  color: '2D59A9',
  route: routeValue,
});

describe('azoresbusVehicleLineCode', () => {
  it('is null while the route index has not reached this bus', () => {
    assert.equal(azoresbusVehicleLineCode(vehicle('1', null)), null);
  });

  it('reads the code off the server-attached route', () => {
    assert.equal(azoresbusVehicleLineCode(vehicle('1', route('7', '110'))), '110');
  });
});

describe('compareLineCodes', () => {
  it('orders numerically rather than as strings', () => {
    // '1001' < '110' as text, which would put the thousand-series first.
    const sorted = ['110', '1001', '101'].sort(compareLineCodes);
    assert.deepEqual(sorted, ['101', '110', '1001']);
  });

  it('puts lettered services after the numbered ones', () => {
    const sorted = ['N01', '311', 'E02', '101'].sort(compareLineCodes);
    assert.deepEqual(sorted, ['101', '311', 'E02', 'N01']);
  });
});

describe('azoresbusFleetLines', () => {
  it('de-duplicates the fleet down to the lines actually running', () => {
    const lines = azoresbusFleetLines([
      vehicle('1', route('7', '110')),
      vehicle('2', route('7', '110')),
      vehicle('3', route('1', '101')),
    ]);
    assert.deepEqual(lines.map((line) => line.nameShort), ['101', '110']);
  });

  it('omits buses whose line is not known yet rather than inventing a chip', () => {
    const lines = azoresbusFleetLines([
      vehicle('1', null),
      vehicle('2', route('1', '101')),
    ]);
    assert.deepEqual(lines.map((line) => line.nameShort), ['101']);
  });

  it('is empty for an empty fleet', () => {
    assert.deepEqual(azoresbusFleetLines([]), []);
    assert.deepEqual(azoresbusFleetLines(undefined), []);
  });
});

describe('filterVehiclesByLineCodes', () => {
  const fleet = [
    vehicle('1', route('7', '110')),
    vehicle('2', route('1', '101')),
    vehicle('3', null),
    vehicle('4', route('9', '311')),
  ];

  it('treats an empty selection as "all", not as "none"', () => {
    // The selection starts empty; a map that opens with no buses reads broken.
    assert.equal(filterVehiclesByLineCodes(fleet, []).length, 4);
  });

  it('keeps only the requested line', () => {
    assert.deepEqual(filterVehiclesByLineCodes(fleet, ['110']).map((v) => v.id), ['1']);
  });

  it('unions several selected lines', () => {
    assert.deepEqual(
      filterVehiclesByLineCodes(fleet, ['110', '311']).map((v) => v.id),
      ['1', '4'],
    );
  });

  it('excludes unlabelled buses once a specific line is chosen', () => {
    assert.deepEqual(filterVehiclesByLineCodes(fleet, ['101']).map((v) => v.id), ['2']);
  });
});

describe('toggleLineCode', () => {
  it('adds, removes, and keeps the result numerically sorted', () => {
    assert.deepEqual(toggleLineCode([], '110'), ['110']);
    assert.deepEqual(toggleLineCode(['110'], '101'), ['101', '110']);
    assert.deepEqual(toggleLineCode(['101', '110'], '110'), ['101']);
  });

  it('does not mutate the selection it was given', () => {
    const before = ['110'];
    toggleLineCode(before, '101');
    assert.deepEqual(before, ['110']);
  });
});

describe('azoresbusColorHex', () => {
  it('prefixes the bare vendor hex', () => {
    assert.equal(azoresbusColorHex('2D59A9'), '#2d59a9');
  });

  it('falls back for junk rather than emitting an invalid colour', () => {
    assert.equal(azoresbusColorHex(''), '#2563eb');
    assert.equal(azoresbusColorHex(undefined), '#2563eb');
    assert.equal(azoresbusColorHex('nope'), '#2563eb');
  });
});
