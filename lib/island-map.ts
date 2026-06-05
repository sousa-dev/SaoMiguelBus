import type { Region } from 'react-native-maps';

import { staticIslandConfig } from '@/config/island';

/** Geographic extent of São Miguel (Azores) — pan/zoom clamped to this box. */
export const saoMiguelMapBounds = {
  southWest: { lat: 37.688, lng: -25.995 },
  northEast: { lat: 37.865, lng: -25.07 },
} as const;

export type MapBounds = {
  southWest: { lat: number; lng: number };
  northEast: { lat: number; lng: number };
};

const PAD = 1.04;

/** Looser zoom/pan viewport for traffic (radares) — pins and GPS still use strict `saoMiguelMapBounds`. */
export const trafficMapViewportPad = 1.32;

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
export function getIslandMapRegion(
  bounds: MapBounds = saoMiguelMapBounds,
  viewportPad = PAD,
): Region {
  const center = staticIslandConfig.mapCenter;
  const latSpan = bounds.northEast.lat - bounds.southWest.lat;
  const lngSpan = bounds.northEast.lng - bounds.southWest.lng;
  return {
    latitude: center.lat,
    longitude: center.lng,
    latitudeDelta: latSpan * viewportPad,
    longitudeDelta: lngSpan * viewportPad,
  };
}

export function clampMapRegion(
  region: Region,
  bounds: MapBounds = saoMiguelMapBounds,
  viewportPad = PAD,
): Region {
  const maxLatDelta = (bounds.northEast.lat - bounds.southWest.lat) * viewportPad;
  const maxLngDelta = (bounds.northEast.lng - bounds.southWest.lng) * viewportPad;

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

export function regionNeedsClamp(
  region: Region,
  bounds: MapBounds = saoMiguelMapBounds,
  viewportPad = PAD,
) {
  const clamped = clampMapRegion(region, bounds, viewportPad);
  return (
    Math.abs(clamped.latitude - region.latitude) > 1e-6 ||
    Math.abs(clamped.longitude - region.longitude) > 1e-6 ||
    Math.abs(clamped.latitudeDelta - region.latitudeDelta) > 1e-6 ||
    Math.abs(clamped.longitudeDelta - region.longitudeDelta) > 1e-6
  );
}

/** Geographic extent of the Azores archipelago (all main islands). */
export const azoresArchipelagoBounds = {
  southWest: { lat: 36.72, lng: -31.35 },
  northEast: { lat: 39.78, lng: -24.55 },
} as const;

export function isWithinAzoresBounds(lat: number, lng: number) {
  return isWithinIslandBounds(lat, lng, azoresArchipelagoBounds);
}

/** Default map viewport framing the full Azores archipelago. */
export function getAzoresArchipelagoRegion(): Region {
  const { southWest, northEast } = azoresArchipelagoBounds;
  const latSpan = northEast.lat - southWest.lat;
  const lngSpan = northEast.lng - southWest.lng;
  return {
    latitude: (southWest.lat + northEast.lat) / 2,
    longitude: (southWest.lng + northEast.lng) / 2,
    latitudeDelta: latSpan * PAD,
    longitudeDelta: lngSpan * PAD,
  };
}

/** Wide Azores viewport when no events are available. */
export const azoresSeismicFallbackRegion: Region = getAzoresArchipelagoRegion();

/**
 * Fit map to seismic event markers (archipelago-wide). No pan clamp — events span
 * beyond São Miguel island bounds.
 */
export function getSeismicMapRegion(
  events: { latitude: number; longitude: number }[],
): Region {
  if (events.length === 0) {
    return azoresSeismicFallbackRegion;
  }

  let minLat = events[0].latitude;
  let maxLat = events[0].latitude;
  let minLng = events[0].longitude;
  let maxLng = events[0].longitude;

  for (const e of events) {
    minLat = Math.min(minLat, e.latitude);
    maxLat = Math.max(maxLat, e.latitude);
    minLng = Math.min(minLng, e.longitude);
    maxLng = Math.max(maxLng, e.longitude);
  }

  const pad = 1.35;
  const latSpan = Math.max((maxLat - minLat) * pad, 0.55);
  const lngSpan = Math.max((maxLng - minLng) * pad, 0.85);

  const fitted: Region = {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: latSpan,
    longitudeDelta: lngSpan,
  };

  const archipelago = getAzoresArchipelagoRegion();
  return {
    latitude: fitted.latitude,
    longitude: fitted.longitude,
    latitudeDelta: Math.min(fitted.latitudeDelta, archipelago.latitudeDelta),
    longitudeDelta: Math.min(fitted.longitudeDelta, archipelago.longitudeDelta),
  };
}

/** Marker color by magnitude (green / amber / red). */
export function markerColorForMagnitude(magnitude: number): string {
  if (magnitude >= 4.5) {
    return '#C62828';
  }
  if (magnitude >= 3) {
    return '#E65100';
  }
  return '#2E7D32';
}

/** Marker bubble size (px) scaled by magnitude. */
export function markerSizeForMagnitude(magnitude: number): number {
  if (magnitude >= 5) {
    return 48;
  }
  if (magnitude >= 4) {
    return 42;
  }
  if (magnitude >= 3) {
    return 36;
  }
  return 30;
}
