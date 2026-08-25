/**
 * Where a rider may change buses, and how long the change costs.
 *
 * Port of `transit/services/transfer_points.py`. Every constant and every
 * ordering here mirrors it deliberately: the two run the same search on the same
 * network, and a divergence shows up only as online and offline results
 * disagreeing for one search — the hardest kind of bug to notice and the exact
 * failure `lib/trip-segment.ts` already exists to prevent.
 *
 * A NEIGHBOUR MAP, not a clustering. Single-link clustering chains: A near B and
 * B near C puts A and C in one group even 500 m apart, which in a town centre
 * merges a whole street into one "interchange" and invents connections nobody
 * can make.
 */

export const TRANSFER_RADIUS_M = 250;

/** ~4 km/h — slow on purpose; the rider has luggage and does not know the terminal. */
export const WALK_SPEED_M_PER_MIN = 67;

/** Buffer on top of the walk, applied even at the same stop. Rural timetables are not exact. */
export const MIN_TRANSFER_MINUTES = 5;

/**
 * Below this much SLACK — time left standing at the boarding stop once the walk
 * is done — the change is worth warning about.
 *
 * Measured on slack, not the raw wait: a 12-minute wait with a 9-minute walk
 * leaves three minutes, while 12 minutes at the stop you already stand at
 * leaves twelve. Missing a connection here is rarely a ten-minute problem — on
 * this network the next bus is often hours later — so the threshold is
 * deliberately generous.
 */
export const TIGHT_TRANSFER_MINUTES = 30;

const EARTH_RADIUS_M = 6_371_000;
const METRES_PER_DEGREE_LAT = 111_320;

export interface TransferStop {
  id: number;
  latitude: number;
  longitude: number;
}

/** Great-circle distance in metres — same formula as `azoresbus.services_stops.haversine_m`. */
export function haversineM(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dPhi = phi2 - phi1;
  const dLambda = toRad(lon2 - lon1);
  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

export function walkMinutes(distanceM: number): number {
  if (distanceM <= 0) {
    return 0;
  }
  return Math.ceil(distanceM / WALK_SPEED_M_PER_MIN);
}

export function transferMinutes(distanceM: number): number {
  return MIN_TRANSFER_MINUTES + walkMinutes(distanceM);
}

/**
 * Reject coordinates that would invent interchanges.
 *
 * Null Island is the failure that matters. Two stops with missing coordinates
 * both land at (0, 0), measure zero metres apart, and the scan cheerfully offers
 * a change between two villages 40 km apart — the single worst thing this
 * feature can do, because a rider acts on it and is stranded.
 *
 * It only ever removes a stop from the INTERCHANGE set: the stop still appears
 * in searches and still carries riders.
 */
export function hasUsablePosition(latitude: number, longitude: number): boolean {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return false;
  }
  if (latitude === 0 && longitude === 0) {
    return false;
  }
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

export type TransferNeighbours = Map<number, [number, number][]>;

/**
 * `stopId -> [[reachableStopId, minutes], ...]`, always including itself.
 *
 * Grid-bucketed, so this is linear in the stop count: at 816 stops the naive
 * form is 665k distance calls, on the device, on every search.
 *
 * Longitude cells are the same width in DEGREES as latitude cells, which makes
 * them narrower in metres at 37.7°N — so the grid over-collects candidates and
 * the distance check rejects them. Over-collecting is correct here;
 * under-collecting would silently drop real connections.
 */
export function buildTransferNeighbours(stops: TransferStop[]): TransferNeighbours {
  const sizeDeg = TRANSFER_RADIUS_M / METRES_PER_DEGREE_LAT;
  const cellKey = (latitude: number, longitude: number) =>
    `${Math.floor(latitude / sizeDeg)}:${Math.floor(longitude / sizeDeg)}`;

  const rows = [...stops].sort((a, b) => a.id - b.id);

  // Only stops we can actually locate take part in the DISTANCE search. A stop
  // keeps its own entry either way: changing buses at the stop you are already
  // standing at needs no geometry.
  const locatable = rows.filter((stop) => hasUsablePosition(stop.latitude, stop.longitude));
  const usable = new Set(locatable.map((stop) => stop.id));

  const buckets = new Map<string, TransferStop[]>();
  for (const row of locatable) {
    const key = cellKey(row.latitude, row.longitude);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(row);
    } else {
      buckets.set(key, [row]);
    }
  }

  const neighbours: TransferNeighbours = new Map();
  for (const stop of rows) {
    const found: [number, number][] = [[stop.id, MIN_TRANSFER_MINUTES]];

    if (usable.has(stop.id)) {
      const baseLat = Math.floor(stop.latitude / sizeDeg);
      const baseLon = Math.floor(stop.longitude / sizeDeg);

      for (let dLat = -1; dLat <= 1; dLat += 1) {
        for (let dLon = -1; dLon <= 1; dLon += 1) {
          const bucket = buckets.get(`${baseLat + dLat}:${baseLon + dLon}`);
          if (!bucket) {
            continue;
          }
          for (const other of bucket) {
            if (other.id === stop.id) {
              continue;
            }
            const distance = haversineM(
              stop.latitude,
              stop.longitude,
              other.latitude,
              other.longitude,
            );
            if (distance <= TRANSFER_RADIUS_M) {
              found.push([other.id, transferMinutes(distance)]);
            }
          }
        }
      }
    }

    found.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    neighbours.set(stop.id, found);
  }

  return neighbours;
}
