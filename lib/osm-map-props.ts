import { Platform } from 'react-native';
import { PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';

/** Native MapView props required for OSM raster tiles (UrlTile) instead of Google/Apple basemap. */
export function osmMapViewProps() {
  return {
    provider: Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT,
    mapType: 'none' as const,
  };
}
