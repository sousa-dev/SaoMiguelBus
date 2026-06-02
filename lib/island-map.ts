import type { Region } from 'react-native-maps';

import { staticIslandConfig } from '@/config/island';

/** Geographic extent of São Miguel (Azores) — pan/zoom clamped to this box. */
export const saoMiguelMapBounds = {
  southWest: { lat: 37.688, lng: -25.995 },
  northEast: { lat: 37.865, lng: -25.07 },
} as const;

export type MapBounds = typeof saoMiguelMapBounds;

const PAD = 1.04;

export function isWithinIslandBounds(lat: number, lng: number, bounds: MapBounds = saoMiguelMapBounds) {
  return (
    lat >= bounds.southWest.lat &&
    lat <= bounds.northEast.lat &&
    lng >= bounds.southWest.lng &&
    lng <= bounds.northEast.lng
  );
}

/** Keep a user-picked pin inside the island map box. */
export function clampCoordinate(
  lat: number,
  lng: number,
  bounds: MapBounds = saoMiguelMapBounds,
): { lat: number; lng: number } {
  return {
    lat: Math.min(Math.max(lat, bounds.southWest.lat), bounds.northEast.lat),
    lng: Math.min(Math.max(lng, bounds.southWest.lng), bounds.northEast.lng),
  };
}

export function coordinateToRegion(
  coords: { lat: number; lng: number },
  delta = 0.04,
): Region {
  return {
    latitude: coords.lat,
    longitude: coords.lng,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
}

/** Region that frames the full island (used as default map viewport). */
export function getIslandMapRegion(bounds: MapBounds = saoMiguelMapBounds): Region {
  const center = staticIslandConfig.mapCenter;
  const latSpan = bounds.northEast.lat - bounds.southWest.lat;
  const lngSpan = bounds.northEast.lng - bounds.southWest.lng;
  return {
    latitude: center.lat,
    longitude: center.lng,
    latitudeDelta: latSpan * PAD,
    longitudeDelta: lngSpan * PAD,
  };
}

export function clampMapRegion(region: Region, bounds: MapBounds = saoMiguelMapBounds): Region {
  const maxLatDelta = (bounds.northEast.lat - bounds.southWest.lat) * PAD;
  const maxLngDelta = (bounds.northEast.lng - bounds.southWest.lng) * PAD;

  const latitudeDelta = Math.min(Math.max(region.latitudeDelta, 0.01), maxLatDelta);
  const longitudeDelta = Math.min(Math.max(region.longitudeDelta, 0.01), maxLngDelta);

  const halfLat = latitudeDelta / 2;
  const halfLng = longitudeDelta / 2;

  const minLat = bounds.southWest.lat + halfLat;
  const maxLat = bounds.northEast.lat - halfLat;
  const minLng = bounds.southWest.lng + halfLng;
  const maxLng = bounds.northEast.lng - halfLng;

  return {
    latitude: Math.min(Math.max(region.latitude, minLat), maxLat),
    longitude: Math.min(Math.max(region.longitude, minLng), maxLng),
    latitudeDelta,
    longitudeDelta,
  };
}

export function regionNeedsClamp(region: Region, bounds: MapBounds = saoMiguelMapBounds) {
  const clamped = clampMapRegion(region, bounds);
  return (
    Math.abs(clamped.latitude - region.latitude) > 1e-6 ||
    Math.abs(clamped.longitude - region.longitude) > 1e-6 ||
    Math.abs(clamped.latitudeDelta - region.latitudeDelta) > 1e-6 ||
    Math.abs(clamped.longitudeDelta - region.longitudeDelta) > 1e-6
  );
}
