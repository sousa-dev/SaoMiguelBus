import type { MinibusLine, MinibusVehicleSummary } from '@/lib/types';

/** Eleven Systems fleet-list colors → PDL line codes (detail API has route; fleet list does not). */
const UPSTREAM_AVL_LINE_BY_COLOR: Readonly<Record<string, string>> = {
  f6bc1c: 'A',
  '00964c': 'B',
  '2d3276': 'C',
  ec6e00: 'D',
};

export function normalizeHexColor(input: string | null | undefined): string | null {
  if (!input) {
    return null;
  }
  const stripped = input.trim().replace(/^#/, '').toLowerCase();
  if (!/^[0-9a-f]{6}$/.test(stripped)) {
    return null;
  }
  return stripped;
}

export function vehicleMatchesLineColor(
  vehicleColor: string | null | undefined,
  lineColor: string | null | undefined,
): boolean {
  const vehicle = normalizeHexColor(vehicleColor);
  const line = normalizeHexColor(lineColor);
  if (!vehicle || !line) {
    return false;
  }
  return vehicle === line;
}

function lookupUpstreamAvlLineCode(color: string | null | undefined): string | null {
  const normalized = normalizeHexColor(color);
  if (!normalized) {
    return null;
  }
  return UPSTREAM_AVL_LINE_BY_COLOR[normalized] ?? null;
}

/** Upstream AVL detail payload embeds route metadata; fleet list has no route. */
function normalizeRouteCode(route: MinibusVehicleSummary['route']): string | null {
  if (route == null) {
    return null;
  }
  if (typeof route === 'object') {
    const nameShort = route.nameShort?.trim();
    if (!nameShort) {
      return null;
    }
    if (/^[A-D]$/i.test(nameShort)) {
      return nameShort.toUpperCase();
    }
    const firstChar = nameShort.charAt(0);
    if (/^[A-D]$/i.test(firstChar)) {
      return firstChar.toUpperCase();
    }
    return null;
  }
  const routeCode = String(route).trim();
  if (!routeCode || !/^[A-D]$/i.test(routeCode)) {
    return null;
  }
  return routeCode.toUpperCase();
}

function vehicleUpstreamColor(vehicle: MinibusVehicleSummary): string | null | undefined {
  if (vehicle.color) {
    return vehicle.color;
  }
  const route = vehicle.route;
  if (route && typeof route === 'object' && route.color) {
    return route.color;
  }
  return null;
}

export function lineCodeFromUpstreamAvlColor(color: string | null | undefined): string | null {
  return lookupUpstreamAvlLineCode(color);
}

/** Legacy alias — some bundles referenced this shorter name during minibus live rollout. */
export const lineCodeFromUpstream = lineCodeFromUpstreamAvlColor;

export function resolveLineForVehicle(
  vehicle: MinibusVehicleSummary,
  lines: MinibusLine[],
): MinibusLine | null {
  const upstreamCode = lookupUpstreamAvlLineCode(vehicleUpstreamColor(vehicle));
  if (upstreamCode) {
    const byCode = lines.find((line) => line.code.toUpperCase() === upstreamCode);
    if (byCode) {
      return byCode;
    }
  }

  const routeCode = normalizeRouteCode(vehicle.route);
  if (routeCode) {
    const byRoute = lines.find((line) => line.code.toUpperCase() === routeCode);
    if (byRoute) {
      return byRoute;
    }
  }

  for (const line of lines) {
    if (vehicleMatchesLineColor(vehicleUpstreamColor(vehicle), line.color)) {
      return line;
    }
  }
  return null;
}

export function vehicleLineColorHex(vehicle: MinibusVehicleSummary, lines: MinibusLine[]): string {
  const line = resolveLineForVehicle(vehicle, lines);
  if (line?.color) {
    const normalized = normalizeHexColor(line.color);
    if (normalized) {
      return `#${normalized}`;
    }
    return line.color.startsWith('#') ? line.color : `#${line.color}`;
  }
  const upstream = normalizeHexColor(vehicleUpstreamColor(vehicle));
  return upstream ? `#${upstream}` : '#2563eb';
}

export function filterVehiclesByLineSlug(
  vehicles: MinibusVehicleSummary[],
  lines: MinibusLine[],
  lineSlug: string | null,
): MinibusVehicleSummary[] {
  if (!lineSlug) {
    return vehicles;
  }
  const line = lines.find((row) => row.slug === lineSlug);
  if (!line) {
    return vehicles;
  }
  return vehicles.filter((vehicle) => resolveLineForVehicle(vehicle, lines)?.slug === line.slug);
}
