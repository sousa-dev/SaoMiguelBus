import { vehicleMarkerOverlay } from '@/features/live-tracking/lib/vehicle-marker-overlay';
import type { MapMarkerOverlay } from '@/lib/map-overlays';
import type { AzoresbusVehicleSummary } from '@/lib/types';

import { azoresbusVehicleColorHex, azoresbusVehicleLineCode } from './vehicleLine';

/** Wider than minibus's circle because it carries a 3-character line code. */
export const AZORESBUS_VEHICLE_MARKER_SIZE = 34;

export function azoresbusVehicleMarkerOverlay(
  vehicle: AzoresbusVehicleSummary,
  label: string,
  onPress?: () => void,
): MapMarkerOverlay | null {
  return vehicleMarkerOverlay(vehicle, azoresbusVehicleColorHex(vehicle), label, {
    idPrefix: 'azoresbus',
    size: AZORESBUS_VEHICLE_MARKER_SIZE,
    onPress,
  });
}

export function azoresbusVehicleMarkerLabel(
  vehicle: AzoresbusVehicleSummary,
  unknownLabel: string,
): string {
  return azoresbusVehicleLineCode(vehicle) ?? unknownLabel;
}
