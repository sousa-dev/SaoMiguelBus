import { Platform } from 'react-native';
import { UrlTile } from 'react-native-maps';

import { mapTileUrl } from '@/lib/map-tiles';

type Props = {
  isDark?: boolean;
};

/**
 * Themed raster base layer for react-native-maps.
 * Pair with `mapType="none"` on MapView so land/ocean render without Google credentials.
 */
export function OsmMapLayer({ isDark = false }: Props) {
  if (Platform.OS === 'web') {
    return null;
  }

  return (
    <UrlTile
      urlTemplate={mapTileUrl(isDark)}
      maximumZ={19}
      flipY={false}
      tileSize={256}
      zIndex={-1}
    />
  );
}
