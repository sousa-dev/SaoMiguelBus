import { Platform } from 'react-native';

/** Light basemap — OpenStreetMap raster tiles (no API key). */
export const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

/**
 * Android light tiles — CARTO voyager (OSM data).
 * tile.openstreetmap.org often blocks react-native-maps' default okhttp User-Agent on Android.
 */
export const ANDROID_LIGHT_TILE_URL =
  'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png';

/** Dark basemap — CARTO dark_all (OSM data, no API key). */
export const CARTO_DARK_TILE_URL = 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';

export function mapTileUrl(isDark: boolean): string {
  if (isDark) {
    return CARTO_DARK_TILE_URL;
  }
  return Platform.OS === 'android' ? ANDROID_LIGHT_TILE_URL : OSM_TILE_URL;
}

export function mapTileAttribution(isDark: boolean): string {
  if (isDark) {
    return '© OpenStreetMap © CARTO';
  }
  return Platform.OS === 'android'
    ? '© OpenStreetMap © CARTO'
    : '© OpenStreetMap contributors';
}
