/** Light basemap — OpenStreetMap raster tiles (no API key). */
export const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

/** Dark basemap — CARTO dark_all (OSM data, no API key). */
export const CARTO_DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

export function mapTileUrl(isDark: boolean): string {
  return isDark ? CARTO_DARK_TILE_URL : OSM_TILE_URL;
}

export function mapTileAttribution(isDark: boolean): string {
  return isDark ? '© OpenStreetMap © CARTO' : '© OpenStreetMap contributors';
}
