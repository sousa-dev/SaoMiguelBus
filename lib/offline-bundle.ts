import AsyncStorage from '@react-native-async-storage/async-storage';

import { staticIslandConfig } from '@/config/island';
import { fetchOfflineBundle, fetchOfflineBundleVersion, fetchWebappLoad } from '@/lib/api';
import { logger } from '@/lib/logger';
import type {
  OfflineBundle,
  OfflineHoliday,
  OfflineRouteRow,
  OfflineStop,
} from '@/lib/offline-search';

// The search itself is pure and lives in `lib/offline-search.ts`; this module
// owns storage and refresh. Re-exported because every consumer imports from here.
export {
  offlineSearch,
  type OfflineBundle,
  type OfflineHoliday,
  type OfflineRouteRow,
  type OfflineStop,
} from '@/lib/offline-search';

/** Minimum spacing between successful syncs (foreground/staleness driven). */
export const MIN_SYNC_INTERVAL = 1000 * 60 * 60; // 1h

function bundleKey() {
  return `azores_hub_offline_bundle_${staticIslandConfig.islandKey}`;
}

export async function loadCachedBundle(): Promise<OfflineBundle | null> {
  const raw = await AsyncStorage.getItem(bundleKey());
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as OfflineBundle;
  } catch {
    return null;
  }
}

export async function saveCachedBundle(bundle: OfflineBundle): Promise<void> {
  await AsyncStorage.setItem(bundleKey(), JSON.stringify(bundle));
}

/** Legacy v2 fallback used only when the v3 endpoint is unavailable (e.g. 404). */
async function refreshOfflineBundleFromV2(): Promise<OfflineBundle | null> {
  const data = await fetchWebappLoad();
  if (!Array.isArray(data) || data.length < 2) {
    return null;
  }
  const meta = data[0] as {
    stops?: OfflineStop[];
    holidays?: OfflineHoliday[];
    infos?: Record<string, unknown>[];
  };
  const routes = data.slice(1) as OfflineRouteRow[];
  const bundle: OfflineBundle = {
    version: null,
    stops: meta.stops ?? [],
    holidays: meta.holidays ?? [],
    infos: meta.infos ?? [],
    routes,
    fetchedAt: new Date().toISOString(),
  };
  await saveCachedBundle(bundle);
  return bundle;
}

export async function refreshOfflineBundle(): Promise<OfflineBundle | null> {
  try {
    const data = await fetchOfflineBundle();
    const bundle: OfflineBundle = {
      version: data.version ?? null,
      stops: (data.stops ?? []).map((s) => ({
        name: s.name,
        latitude: s.latitude,
        longitude: s.longitude,
      })),
      holidays: data.holidays ?? [],
      infos: data.infos ?? [],
      routes: data.routes ?? [],
      fetchedAt: new Date().toISOString(),
    };
    await saveCachedBundle(bundle);
    return bundle;
  } catch (error) {
    logger.warn('offline bundle v3 unavailable, falling back to v2', error);
    return refreshOfflineBundleFromV2();
  }
}

/**
 * Version-aware refresh: probe the server version first and skip the (large)
 * download when the cached bundle already matches.
 */
export async function refreshOfflineBundleIfStale(): Promise<{
  bundle: OfflineBundle | null;
  updated: boolean;
}> {
  const cached = await loadCachedBundle();
  try {
    const remote = await fetchOfflineBundleVersion();
    if (cached?.version && remote.version && cached.version === remote.version) {
      return { bundle: cached, updated: false };
    }
  } catch (error) {
    // Version probe failed (offline / older backend) — fall through to a full
    // refresh attempt, which itself falls back to v2 when needed.
    logger.debug('offline version probe failed', error);
  }
  const bundle = await refreshOfflineBundle();
  return { bundle, updated: Boolean(bundle) };
}

export async function hasOfflineCache(): Promise<boolean> {
  const bundle = await loadCachedBundle();
  return Boolean(bundle?.routes?.length);
}
