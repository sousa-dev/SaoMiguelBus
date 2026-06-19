import type { Region } from 'react-native-maps';

import { getIslandMapRegion } from '@/lib/island-map';
import type {
  MinibusJourney,
  MinibusLeg,
  MinibusNetwork,
  MinibusNetworkStop,
  MinibusStopRef,
} from '@/lib/types';

export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

export function hasCoordinates(
  stop: Pick<MinibusNetworkStop, 'latitude' | 'longitude'> | MinibusStopRef,
): boolean {
  return typeof stop.latitude === 'number' && typeof stop.longitude === 'number';
}

export function stopCoordinate(
  stop: Pick<MinibusNetworkStop, 'latitude' | 'longitude'> | MinibusStopRef,
): MapCoordinate | null {
  if (!hasCoordinates(stop)) {
    return null;
  }
  return { latitude: stop.latitude as number, longitude: stop.longitude as number };
}

const COORD_EPSILON = 1e-5;

export function coordinatesMatch(a: MapCoordinate, b: MapCoordinate): boolean {
  return (
    Math.abs(a.latitude - b.latitude) < COORD_EPSILON &&
    Math.abs(a.longitude - b.longitude) < COORD_EPSILON
  );
}

function orderedStops(stops: MinibusNetworkStop[]): MinibusNetworkStop[] {
  return [...stops].sort((a, b) => a.sequence - b.sequence);
}

/** Last stop on a circular line shares coords with stop 1 (loop return). */
export function isLoopTerminus(stop: MinibusNetworkStop, stops: MinibusNetworkStop[]): boolean {
  const ordered = orderedStops(stops);
  const last = ordered[ordered.length - 1];
  const first = ordered[0];
  if (!last || !first || last.key !== stop.key) {
    return false;
  }
  const firstCoord = stopCoordinate(first);
  const lastCoord = stopCoordinate(last);
  return Boolean(firstCoord && lastCoord && coordinatesMatch(firstCoord, lastCoord));
}

/** Show sequence 1 on the loop-return stop instead of the schematic last number. */
export function displayStopSequence(stop: MinibusNetworkStop, stops: MinibusNetworkStop[]): number {
  return isLoopTerminus(stop, stops) ? 1 : stop.sequence;
}

/** One map pin per physical location; loop return uses the first-stop label. */
export function lineMapStops(stops: MinibusNetworkStop[]): MinibusNetworkStop[] {
  const ordered = orderedStops(stops);
  if (ordered.length < 2 || !isLoopTerminus(ordered[ordered.length - 1], ordered)) {
    return ordered;
  }
  return ordered.slice(0, -1);
}

/** Map highlight follows the visible pin when the loop terminus is selected. */
export function normalizeMapHighlightKey(
  stopKey: string | null,
  stops: MinibusNetworkStop[],
): string | null {
  if (!stopKey) {
    return null;
  }
  const ordered = orderedStops(stops);
  const last = ordered[ordered.length - 1];
  const first = ordered[0];
  if (last?.key === stopKey && isLoopTerminus(last, ordered) && first) {
    return first.key;
  }
  return stopKey;
}

export function linePolyline(stops: MinibusNetworkStop[]): MapCoordinate[] {
  return lineMapStops(stops)
    .map((stop) => stopCoordinate(stop))
    .filter((coord): coord is MapCoordinate => coord !== null);
}

export function stopsByKey(network: MinibusNetwork): Map<string, MinibusNetworkStop> {
  const map = new Map<string, MinibusNetworkStop>();
  for (const line of network.lines) {
    for (const stop of line.stops) {
      map.set(stop.key, stop);
    }
  }
  return map;
}

function enrichStopRef(ref: MinibusStopRef, byKey: Map<string, MinibusNetworkStop>): MinibusStopRef {
  if (hasCoordinates(ref)) {
    return ref;
  }
  const stop = byKey.get(ref.key);
  if (!stop || !hasCoordinates(stop)) {
    return ref;
  }
  return {
    ...ref,
    external_id: stop.external_id ?? ref.external_id ?? null,
    latitude: stop.latitude ?? null,
    longitude: stop.longitude ?? null,
  };
}

/** Fill missing leg coordinates from the cached network graph (offline search / stale API). */
export function enrichJourneyCoordinates(
  journey: MinibusJourney,
  network: MinibusNetwork | null,
): MinibusJourney {
  if (!network) {
    return journey;
  }
  const byKey = stopsByKey(network);
  return {
    ...journey,
    legs: journey.legs.map((leg) => ({
      ...leg,
      board: enrichStopRef(leg.board, byKey),
      alight: enrichStopRef(leg.alight, byKey),
      stops: leg.stops.map((stop) => enrichStopRef(stop, byKey)),
    })),
  };
}

export function legPolyline(leg: MinibusLeg): MapCoordinate[] {
  return leg.stops.map((stop) => stopCoordinate(stop)).filter((coord): coord is MapCoordinate => coord !== null);
}

export type JourneyPolyline = {
  id: string;
  color: string;
  coordinates: MapCoordinate[];
};

export function journeyPolylines(journey: MinibusJourney): JourneyPolyline[] {
  return journey.legs
    .map((leg, index) => ({
      id: `${leg.line_code}-${leg.board.key}-${index}`,
      color: leg.line_color ?? '#2563eb',
      coordinates: legPolyline(leg),
    }))
    .filter((line) => line.coordinates.length > 0);
}

export function journeyHasMapCoordinates(journey: MinibusJourney): boolean {
  return allJourneyCoordinates(journey).length > 0;
}

export function journeyHighlightCoordinates(journey: MinibusJourney): MapCoordinate[] {
  const coords: MapCoordinate[] = [];
  for (const leg of journey.legs) {
    const board = stopCoordinate(leg.board);
    const alight = stopCoordinate(leg.alight);
    if (board) {
      coords.push(board);
    }
    if (alight) {
      coords.push(alight);
    }
  }
  for (const transfer of journey.transfer_stops) {
    const leg = journey.legs.find((row) => row.alight.name === transfer.name);
    const alight = leg ? stopCoordinate(leg.alight) : null;
    if (alight) {
      coords.push(alight);
    }
  }
  return coords;
}

export function allJourneyCoordinates(journey: MinibusJourney): MapCoordinate[] {
  const coords = journeyPolylines(journey).flatMap((row) => row.coordinates);
  return dedupeCoordinates(coords);
}

function dedupeCoordinates(coords: MapCoordinate[]): MapCoordinate[] {
  const seen = new Set<string>();
  const out: MapCoordinate[] = [];
  for (const coord of coords) {
    const key = `${coord.latitude.toFixed(6)},${coord.longitude.toFixed(6)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(coord);
  }
  return out;
}

export function fitRegionForCoordinates(
  coordinates: MapCoordinate[],
  padding = 0.012,
): Region {
  if (!coordinates.length) {
    return getIslandMapRegion();
  }

  const lats = coordinates.map((c) => c.latitude);
  const lngs = coordinates.map((c) => c.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(maxLat - minLat + padding, 0.015),
    longitudeDelta: Math.max(maxLng - minLng + padding, 0.015),
  };
}
