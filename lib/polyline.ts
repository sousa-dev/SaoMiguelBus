export interface LatLng {
  latitude: number;
  longitude: number;
}

/**
 * Decodes a Google encoded polyline into react-native-maps coordinates.
 * Ported from the web app's directionsApiHandler.decodePolyline.
 */
export function decodePolyline(encoded: string): LatLng[] {
  if (!encoded) {
    return [];
  }

  const coordinates: LatLng[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coordinates.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return coordinates;
}

function encodeValue(value: number, out: string[]): void {
  let v = value < 0 ? ~(value << 1) : value << 1;
  while (v >= 0x20) {
    out.push(String.fromCharCode((0x20 | (v & 0x1f)) + 63));
    v >>= 5;
  }
  out.push(String.fromCharCode(v + 63));
}

/**
 * The inverse of `decodePolyline`. Mirrors `shared/geo.encode_polyline` on the
 * server, so a path can round-trip between the two without drift.
 *
 * Lossy only to the 1e5 grid — about a metre, far below the accuracy of the
 * stop positions this is ever drawn against.
 */
export function encodePolyline(coordinates: LatLng[]): string {
  const out: string[] = [];
  let previousLat = 0;
  let previousLng = 0;

  for (const { latitude, longitude } of coordinates) {
    const lat = Math.round(latitude * 1e5);
    const lng = Math.round(longitude * 1e5);
    encodeValue(lat - previousLat, out);
    encodeValue(lng - previousLng, out);
    previousLat = lat;
    previousLng = lng;
  }

  return out.join('');
}
