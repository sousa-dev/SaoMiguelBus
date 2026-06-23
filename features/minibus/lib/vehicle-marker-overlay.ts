import type { MapMarkerOverlay } from '@/lib/map-overlays';
import type { MinibusVehicleSummary } from '@/lib/types';

export const MINIBUS_VEHICLE_MARKER_SIZE = 28;

export function vehicleMarkerOverlay(
  vehicle: MinibusVehicleSummary,
  pinColor: string,
  label: string,
  onPress?: () => void,
): MapMarkerOverlay | null {
  const lat = vehicle.position?.lat;
  const lon = vehicle.position?.lon;
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    return null;
  }

  return {
    id: `minibus-vehicle-${vehicle.id}`,
    latitude: lat,
    longitude: lon,
    pinColor,
    label,
    size: MINIBUS_VEHICLE_MARKER_SIZE,
    highlighted: false,
    title: label,
    onPress,
  };
}
