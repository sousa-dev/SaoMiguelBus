/**
 * Thinning the stop network down to what a map can actually draw.
 *
 * The AzoresBus picker list carries 1632 rows (816 stops, each also under a
 * short-name alias). Handing that to a map is not viable on either platform —
 * least of all the Android Leaflet WebView, where every pin is a DOM node.
 *
 * Two mechanisms, both pure and both testable without a map:
 *
 *   viewport   only stops inside the region being looked at, so panning across
 *              the island never costs more than one screenful.
 *   clustering  at island zoom, stops that would overlap into an unreadable
 *              blob are merged into one pin carrying a count.
 *
 * Grid clustering rather than distance clustering, deliberately: a grid is
 * stable under panning. Distance-based single-link clustering re-groups as new
 * points enter the viewport, so pins visibly jump around while the user drags —
 * the same chaining problem `lib/transfer-points.ts` avoids, showing up as a
 * different symptom.
 */

import type { Stop } from '@/lib/types';

export interface MapRegionLike {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface StopCluster {
  id: string;
  latitude: number;
  longitude: number;
  /** 1 for a real stop; more when several were merged. */
  count: number;
  /** Present only when `count === 1` — the stop this pin actually is. */
  stop?: Stop;
}

/**
 * Above this span (degrees of latitude) individual stops are meaningless — the
 * island is ~0.2° tall, so this is roughly "more than a quarter of it on screen".
 */
export const CLUSTER_ABOVE_DELTA = 0.05;

/** Never draw more than this many pins, whatever the zoom. */
export const MAX_PINS = 220;

/** How many grid cells span the visible region when clustering. */
const GRID = 12;

export function stopsInRegion(stops: Stop[], region: MapRegionLike): Stop[] {
  // A small margin so pins do not pop in exactly at the edge while panning.
  const latPad = region.latitudeDelta * 0.15;
  const lonPad = region.longitudeDelta * 0.15;
  const minLat = region.latitude - region.latitudeDelta / 2 - latPad;
  const maxLat = region.latitude + region.latitudeDelta / 2 + latPad;
  const minLon = region.longitude - region.longitudeDelta / 2 - lonPad;
  const maxLon = region.longitude + region.longitudeDelta / 2 + lonPad;

  return stops.filter(
    (stop) =>
      stop.latitude >= minLat &&
      stop.latitude <= maxLat &&
      stop.longitude >= minLon &&
      stop.longitude <= maxLon,
  );
}

/**
 * The pins to draw for this region.
 *
 * Deterministic: stops are consumed in id order and cells keyed on integer grid
 * coordinates, so the same region always yields the same pins in the same order.
 * A map whose markers reshuffle between renders flickers.
 */
export function clusterStops(stops: Stop[], region: MapRegionLike): StopCluster[] {
  const visible = stopsInRegion(stops, region);

  if (region.latitudeDelta <= CLUSTER_ABOVE_DELTA && visible.length <= MAX_PINS) {
    return [...visible]
      .sort((a, b) => a.id - b.id)
      .map((stop) => ({
        id: `stop-${stop.id}`,
        latitude: stop.latitude,
        longitude: stop.longitude,
        count: 1,
        stop,
      }));
  }

  const latStep = region.latitudeDelta / GRID;
  const lonStep = region.longitudeDelta / GRID;
  const cells = new Map<string, Stop[]>();

  for (const stop of [...visible].sort((a, b) => a.id - b.id)) {
    const key = `${Math.floor(stop.latitude / latStep)}:${Math.floor(stop.longitude / lonStep)}`;
    const bucket = cells.get(key);
    if (bucket) {
      bucket.push(stop);
    } else {
      cells.set(key, [stop]);
    }
  }

  const clusters = [...cells.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, members]) => {
      if (members.length === 1) {
        const stop = members[0];
        return {
          id: `stop-${stop.id}`,
          latitude: stop.latitude,
          longitude: stop.longitude,
          count: 1,
          stop,
        };
      }
      // Centroid, so the pin sits among the stops it stands for.
      return {
        id: `cluster-${key}`,
        latitude: members.reduce((sum, s) => sum + s.latitude, 0) / members.length,
        longitude: members.reduce((sum, s) => sum + s.longitude, 0) / members.length,
        count: members.length,
      };
    });

  // Hard ceiling: densest first, so zooming into Ponta Delgada never stalls.
  return clusters.length <= MAX_PINS
    ? clusters
    : [...clusters].sort((a, b) => b.count - a.count).slice(0, MAX_PINS);
}
