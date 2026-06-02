/** Build-time island config — merged with /api/v3/bootstrap at runtime. */

export type ModuleKey =
  | 'transit'
  | 'news'
  | 'seismic'
  | 'marketplace'
  | 'trails'
  | 'traffic'
  | 'events';

export interface IslandTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export interface IslandConfig {
  islandKey: string;
  islandName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  defaultLocale: string;
  locales: string[];
  enabledModules: ModuleKey[];
  mapCenter: { lat: number; lng: number };
}

const islandKey = process.env.EXPO_PUBLIC_ISLAND_KEY ?? 'sao-miguel';

export const staticIslandConfig: IslandConfig = {
  islandKey,
  islandName: 'São Miguel',
  primaryColor: '#218732',
  secondaryColor: '#343434',
  accentColor: '#ffc107',
  defaultLocale: 'pt',
  locales: ['pt', 'en', 'es', 'de', 'fr', 'it', 'uk', 'zh'],
  enabledModules: ['transit'],
  mapCenter: { lat: 37.7822, lng: -25.4998 },
};
