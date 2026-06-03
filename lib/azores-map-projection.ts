import type { Region } from 'react-native-maps';

import { getAzoresArchipelagoRegion, getSeismicMapRegion } from '@/lib/island-map';

export type MapPoint = { latitude: number; longitude: number };

/** Project lat/lng into 0–1 coordinates within a map region. */
export function projectToUnit(
  lat: number,
  lng: number,
  region: Region,
): { x: number; y: number } {
  const minLat = region.latitude - region.latitudeDelta / 2;
  const maxLat = region.latitude + region.latitudeDelta / 2;
  const minLng = region.longitude - region.longitudeDelta / 2;
  const maxLng = region.longitude + region.longitudeDelta / 2;

  const x = (lng - minLng) / (maxLng - minLng || 1);
  const y = 1 - (lat - minLat) / (maxLat - minLat || 1);
  return {
    x: Math.min(1, Math.max(0, x)),
    y: Math.min(1, Math.max(0, y)),
  };
}

export function regionForPreview(points: MapPoint[]): Region {
  if (points.length === 0) {
    return getAzoresArchipelagoRegion();
  }
  return getSeismicMapRegion(points);
}
