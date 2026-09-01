/**
 * Line identity for AzoresBus vehicles.
 *
 * This is the module that replaces minibus's `vehicleColor.ts`, and it replaces
 * it rather than adapting it because the trick that file relies on does not work
 * here: minibus has four lines with four distinct colours, so colour IS the
 * line. AzoresBus has 56 routes sharing three colours (49 of them `2D59A9`),
 * where colour is a service class -- urban, express, night. Matching on it would
 * put forty buses on one chip.
 *
 * Instead the server attaches the real `route` to each vehicle (see the route
 * index), and everything here reads that. The cost is that `route` can be null
 * while the index is still warming, so every function has to have an answer for
 * a bus whose line we do not know yet -- and that answer is never "hide it".
 */

import type { AzoresbusRoute, AzoresbusVehicleSummary } from '@/lib/types';

const FALLBACK_COLOR = '#2563eb';

export function azoresbusVehicleLineCode(
  vehicle: Pick<AzoresbusVehicleSummary, 'route'>,
): string | null {
  const code = vehicle.route?.nameShort?.trim();
  return code ? code : null;
}

/** Prefixes a bare 6-hex vendor colour; falls back for unknown/missing values. */
export function azoresbusColorHex(color: string | null | undefined): string {
  const raw = color?.trim().replace(/^#/, '');
  if (!raw || !/^[0-9a-f]{6}$/i.test(raw)) {
    return FALLBACK_COLOR;
  }
  return `#${raw.toLowerCase()}`;
}

export function azoresbusVehicleColorHex(
  vehicle: Pick<AzoresbusVehicleSummary, 'route' | 'color'>,
): string {
  return azoresbusColorHex(vehicle.route?.color ?? vehicle.color);
}

/**
 * Sort line codes the way a person reads them: 101 before 110 before 1001, and
 * lettered services (E01, N02) after the numbered ones rather than interleaved
 * by ASCII.
 */
export function compareLineCodes(a: string, b: string): number {
  const numA = Number.parseInt(a, 10);
  const numB = Number.parseInt(b, 10);
  const aIsNum = Number.isFinite(numA) && /^\d/.test(a);
  const bIsNum = Number.isFinite(numB) && /^\d/.test(b);

  if (aIsNum && bIsNum && numA !== numB) {
    return numA - numB;
  }
  if (aIsNum !== bIsNum) {
    return aIsNum ? -1 : 1;
  }
  return a.localeCompare(b);
}

/**
 * The distinct lines currently carrying a bus, for the filter chips.
 *
 * Derived from the live fleet rather than the full 56-route catalogue on
 * purpose: a chip that filters to zero buses is a dead end, and thirty of them
 * would bury the handful that work.
 */
export function azoresbusFleetLines(
  vehicles: AzoresbusVehicleSummary[] | null | undefined,
): AzoresbusRoute[] {
  if (!vehicles?.length) {
    return [];
  }

  const byCode = new Map<string, AzoresbusRoute>();
  for (const vehicle of vehicles) {
    const route = vehicle.route;
    const code = route?.nameShort?.trim();
    if (!route || !code || byCode.has(code)) {
      continue;
    }
    byCode.set(code, route);
  }

  return [...byCode.values()].sort((a, b) =>
    compareLineCodes(a.nameShort, b.nameShort),
  );
}

/**
 * Filter to a set of lines. An empty selection means "all".
 *
 * Empty-means-all rather than empty-means-nothing: the selection starts empty,
 * and a map that begins with no buses on it would read as broken. It also makes
 * "clear" and "select everything" the same gesture.
 *
 * Vehicles with no route yet are excluded from a specific line's view (we cannot
 * claim they are on it) but are always present in the unfiltered view, so a
 * cold route index never makes buses disappear from the map.
 */
export function filterVehiclesByLineCodes<T extends Pick<AzoresbusVehicleSummary, 'route'>>(
  vehicles: T[],
  lineCodes: readonly string[],
): T[] {
  if (!lineCodes.length) {
    return vehicles;
  }
  const wanted = new Set(lineCodes);
  const code = (vehicle: T) => azoresbusVehicleLineCode(vehicle);
  return vehicles.filter((vehicle) => {
    const value = code(vehicle);
    return value != null && wanted.has(value);
  });
}

/** Toggle one line in a selection, returned sorted so the UI order is stable. */
export function toggleLineCode(
  lineCodes: readonly string[],
  code: string,
): string[] {
  const next = new Set(lineCodes);
  if (next.has(code)) {
    next.delete(code);
  } else {
    next.add(code);
  }
  return [...next].sort(compareLineCodes);
}
