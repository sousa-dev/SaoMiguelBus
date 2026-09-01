import type { MapMarkerOverlay } from '@/lib/map-overlays';
import { onColorFor } from '@/lib/color-utils';
import type { LiveVehicleLike } from '@/features/live-tracking/types';

export const LIVE_VEHICLE_MARKER_SIZE = 28;

export type VehicleMarkerOverlayOptions = {
  /** Namespaces the marker id so two operators' layers cannot collide. */
  idPrefix: string;
  size?: number;
  onPress?: () => void;
};

export function vehicleMarkerOverlay(
  vehicle: LiveVehicleLike,
  pinColor: string,
  label: string,
  options: VehicleMarkerOverlayOptions,
): MapMarkerOverlay | null {
  const lat = vehicle.position?.lat;
  const lon = vehicle.position?.lon;
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    return null;
  }

  return {
    id: `${options.idPrefix}-vehicle-${vehicle.id}`,
    latitude: lat,
    longitude: lon,
    pinColor,
    iconKind: 'bus',
    iconColor: onColorFor(pinColor),
    size: options.size ?? LIVE_VEHICLE_MARKER_SIZE,
    highlighted: false,
    title: label,
    onPress: options.onPress,
  };
}
