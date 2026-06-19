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

export function stopsByKey(network: MinibusNetwork): Map<string, MinibusNetworkStop> {
  const map = new Map<string, MinibusNetworkStop>();
  for (const line of network.lines) {
    for (const stop of line.stops) {
      map.set(stop.key, stop);
    }
  }
  return map;
}

export function linePolyline(stops: MinibusNetworkStop[]): MapCoordinate[] {
  return stops
    .slice()
    .sort((a, b) => a.sequence - b.sequence)
    .map((stop) => stopCoordinate(stop))
    .filter((coord): coord is MapCoordinate => coord !== null);
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
  return journey.legs.map((leg, index) => ({
    id: `${leg.line_code}-${leg.board.key}-${index}`,
    color: leg.line_color ?? '#2563eb',
    coordinates: legPolyline(leg),
  }));
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
