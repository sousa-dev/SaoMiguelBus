import type { MinibusLine, MinibusVehicleSummary } from '@/lib/types';

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

export function resolveLineForVehicle(
  vehicle: MinibusVehicleSummary,
  lines: MinibusLine[],
): MinibusLine | null {
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
  return vehicles.filter((vehicle) => vehicleMatchesLineColor(vehicle.color, line.color));
}
