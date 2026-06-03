import AsyncStorage from '@react-native-async-storage/async-storage';

import { staticIslandConfig } from '@/config/island';
import { fetchOfflineBundle, fetchOfflineBundleVersion, fetchWebappLoad } from '@/lib/api';
import { logger } from '@/lib/logger';
import type { TransitSearchResult, TripStop } from '@/lib/types';

/** Minimum spacing between successful syncs (foreground/staleness driven). */
export const MIN_SYNC_INTERVAL = 1000 * 60 * 60; // 1h

export interface OfflineHoliday {
  date: string;
}

export interface OfflineStop {
  name: string;
  latitude?: number;
  longitude?: number;
}

export interface OfflineRouteRow {
  id: number;
  route: string;
  stops: string[];
  times: string[];
  weekday: string;
  likes_percent?: number;
  dislikes_percent?: number;
  information?: Record<string, unknown> | string;
}

export interface OfflineBundle {
  /** Server version fingerprint; `null` when sourced from the legacy v2 fallback. */
  version: string | null;
  stops: OfflineStop[];
  holidays: OfflineHoliday[];
  infos: Record<string, unknown>[];
  routes: OfflineRouteRow[];
  fetchedAt: string;
}

function bundleKey() {
  return `azores_hub_offline_bundle_${staticIslandConfig.islandKey}`;
}

function normalizeStopKey(str: string): string {
  return str
    .toLowerCase()
    .replace(/[-áàâãäéèêëíìîïóòôõöúùûüç]/g, (match) => {
      const from = 'áàâãäéèêëíìîïóòôõöúùûüç';
      const to = 'aaaaaeeeeiiiiooooouuuuc';
      const idx = from.indexOf(match);
      return idx >= 0 ? to[idx] : match;
    })
    .replace(/-/g, '');
}

function dayTypeToWeekday(day: string, holidays: OfflineHoliday[], referenceDate = new Date()): string {
  const isHoliday = holidays.some((h) => {
    const d = new Date(h.date);
    return (
      d.getFullYear() === referenceDate.getFullYear() &&
      d.getMonth() === referenceDate.getMonth() &&
      d.getDate() === referenceDate.getDate()
    );
  });
  if (isHoliday) {
    return 'SUNDAY';
  }
  if (day === 'saturday') {
    return 'SATURDAY';
  }
  if (day === 'sunday') {
    return 'SUNDAY';
  }
  const dow = referenceDate.getDay();
  if (dow === 0) {
    return 'SUNDAY';
  }
  if (dow === 6) {
    return 'SATURDAY';
  }
  return 'WEEKDAY';
}

function mapRowToResult(
  row: OfflineRouteRow,
  originIndex: number,
  destIndex: number,
  originalOrigin: string,
  originalDestination: string,
  dayOfWeek: string,
): TransitSearchResult {
  const segmentStops: TripStop[] = [];
  for (let i = originIndex; i <= destIndex; i++) {
    segmentStops.push({ name: row.stops[i], time: row.times[i], sequence: i });
  }
  const info =
    typeof row.information === 'object' && row.information !== null
      ? row.information
      : { text: row.information ?? '' };
  return {
    id: row.id,
    route: String(row.route).startsWith('C') ? String(row.route) : String(row.route),
    origin: originalOrigin,
    destination: originalDestination,
    start: row.times[originIndex] ?? '',
    end: row.times[destIndex] ?? '',
    typeOfDay: dayOfWeek,
    likesPercent: row.likes_percent ?? 0,
    dislikesPercent: row.dislikes_percent ?? 0,
    information: info as Record<string, unknown>,
    stops: segmentStops,
  };
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

export function offlineSearch(
  bundle: OfflineBundle,
  params: {
    origin: string;
    destination: string;
    day: string;
    start: string;
  },
): TransitSearchResult[] {
  const originKey = normalizeStopKey(params.origin);
  const destKey = normalizeStopKey(params.destination);
  const inputTime = params.start.replace(':', 'h');
  const dayOfWeek = dayTypeToWeekday(params.day, bundle.holidays);

  return bundle.routes
    .filter((row) => {
      const stopKeys = row.stops.map(normalizeStopKey);
      const originIndex = stopKeys.indexOf(originKey);
      const destIndex = stopKeys.indexOf(destKey);
      if (originIndex < 0 || destIndex < 0 || originIndex >= destIndex) {
        return false;
      }
      if (row.weekday !== dayOfWeek) {
        return false;
      }
      const routeTime = row.times[originIndex] ?? '';
      return routeTime >= inputTime;
    })
    .map((row) => {
      const stopKeys = row.stops.map(normalizeStopKey);
      const originIndex = stopKeys.indexOf(originKey);
      const destIndex = stopKeys.indexOf(destKey);
      return mapRowToResult(row, originIndex, destIndex, params.origin, params.destination, dayOfWeek);
    });
}

export async function hasOfflineCache(): Promise<boolean> {
  const bundle = await loadCachedBundle();
  return Boolean(bundle?.routes?.length);
}
