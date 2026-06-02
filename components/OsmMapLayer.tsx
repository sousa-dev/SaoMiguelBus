import { Platform } from 'react-native';
import { UrlTile } from 'react-native-maps';

/** Raster tiles that do not require a Google Maps API key. */
export const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

/**
 * OpenStreetMap base layer for react-native-maps.
 * Pair with `mapType="none"` on MapView so land/ocean render without Google credentials.
 */
export function OsmMapLayer() {
  if (Platform.OS === 'web') {
    return null;
  }

  return (
    <UrlTile
      urlTemplate={OSM_TILE_URL}
      maximumZ={19}
      flipY={false}
      tileSize={256}
      zIndex={-1}
    />
  );
}
