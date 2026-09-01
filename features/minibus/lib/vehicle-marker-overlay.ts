/** Moved to `features/live-tracking/lib/vehicle-marker-overlay`; binds the minibus id namespace. */
import {
  LIVE_VEHICLE_MARKER_SIZE,
  vehicleMarkerOverlay as vehicleMarkerOverlayShared,
} from '@/features/live-tracking/lib/vehicle-marker-overlay';
import type { MapMarkerOverlay } from '@/lib/map-overlays';
import type { MinibusVehicleSummary } from '@/lib/types';

export const MINIBUS_VEHICLE_MARKER_SIZE = LIVE_VEHICLE_MARKER_SIZE;

export function vehicleMarkerOverlay(
  vehicle: MinibusVehicleSummary,
  pinColor: string,
  label: string,
  onPress?: () => void,
): MapMarkerOverlay | null {
  return vehicleMarkerOverlayShared(vehicle, pinColor, label, {
    idPrefix: 'minibus',
    onPress,
  });
}
