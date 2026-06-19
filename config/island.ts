/** Build-time island config — merged with /api/v3/bootstrap at runtime. */

export type ModuleKey =
  | 'transit'
  | 'news'
  | 'seismic'
  | 'marketplace'
  | 'trails'
  | 'traffic'
  | 'events'
  | 'weather';

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
  // Portuguese-first. All shipped catalogs (see lib/i18n.ts) are exposed in the
  // picker so the in-app language list matches what the App Store advertises.
  locales: ['pt', 'en', 'de', 'es', 'fr', 'it', 'uk', 'zh'],
  enabledModules: ['transit', 'events'],
  mapCenter: { lat: 37.7822, lng: -25.4998 },
};

/**
 * Merge bootstrap modules with build-time static modules so client-shipped tabs
 * (e.g. tours tab) stay visible when the API flag lags behind the app.
 */
export function resolveEnabledModules(fromBootstrap: string[] | undefined): ModuleKey[] {
  if (!fromBootstrap?.length) {
    return staticIslandConfig.enabledModules;
  }
  const merged = new Set<ModuleKey>([
    ...(fromBootstrap as ModuleKey[]),
    ...staticIslandConfig.enabledModules,
  ]);
  return Array.from(merged);
}
