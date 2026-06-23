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

export function lineCodeFromUpstreamAvlColor(color: string | null | undefined): string | null {
  const normalized = normalizeHexColor(color);
  if (!normalized) {
    return null;
  }
  return UPSTREAM_AVL_LINE_BY_COLOR[normalized] ?? null;
}

export function resolveLineForVehicle(
  vehicle: MinibusVehicleSummary,
  lines: MinibusLine[],
): MinibusLine | null {
  const upstreamCode = lineCodeFromUpstreamAvlColor(vehicle.color);
  if (upstreamCode) {
    const byCode = lines.find((line) => line.code.toUpperCase() === upstreamCode);
    if (byCode) {
      return byCode;
    }
  }

  const routeCode = vehicle.route?.trim();
  if (routeCode && /^[A-D]$/i.test(routeCode)) {
    const byRoute = lines.find((line) => line.code.toUpperCase() === routeCode.toUpperCase());
    if (byRoute) {
      return byRoute;
    }
  }

  for (const line of lines) {
    if (vehicleMatchesLineColor(vehicle.color, line.color)) {
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
  const upstream = normalizeHexColor(vehicle.color);
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
