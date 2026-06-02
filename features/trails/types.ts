export type TrailGeoJson = {
  type: string;
  coordinates?: unknown;
};

export interface TrailSummary {
  id: number;
  name: string;
  difficulty: string;
  distanceKm: number | null;
}

export interface TrailStage {
  id: number;
  name: string;
  sequence: number;
  geojson: TrailGeoJson;
}

export interface TrailDetail extends TrailSummary {
  geojson: TrailGeoJson;
  stages: TrailStage[];
  attribution: string;
}

export interface TrailsListResponse {
  trails: TrailSummary[];
  attribution: string;
}

export interface POI {
  id: number;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
}

export interface POIsListResponse {
  pois: POI[];
  attribution: string;
}

export function trailCentroid(geojson: TrailGeoJson): { lat: number; lng: number } | null {
  const coords: number[][] = [];

  const walk = (node: unknown): void => {
    if (!Array.isArray(node)) {
      return;
    }
    if (
      node.length >= 2 &&
      typeof node[0] === 'number' &&
      typeof node[1] === 'number' &&
      (node.length === 2 || typeof node[2] !== 'object')
    ) {
      coords.push([node[0], node[1]]);
      return;
    }
    for (const item of node) {
      walk(item);
    }
  };

  if (geojson.type === 'Point') {
    const point = geojson.coordinates;
    return { lng: point[0], lat: point[1] };
  }

  walk(geojson.coordinates);
  if (!coords.length) {
    return null;
  }

  const mid = coords[Math.floor(coords.length / 2)];
  return { lng: mid[0], lat: mid[1] };
}
