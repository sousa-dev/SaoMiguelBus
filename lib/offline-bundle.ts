import AsyncStorage from '@react-native-async-storage/async-storage';

import { staticIslandConfig } from '@/config/island';
import { fetchWebappLoad } from '@/lib/api';
import type { TransitSearchResult, TripStop } from '@/lib/types';

export interface OfflineHoliday {
  date: string;
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
  stops: { name: string }[];
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

export async function refreshOfflineBundle(): Promise<OfflineBundle | null> {
  const data = await fetchWebappLoad();
  if (!Array.isArray(data) || data.length < 2) {
    return null;
  }
  const meta = data[0] as {
    stops?: { name: string }[];
    holidays?: OfflineHoliday[];
    infos?: Record<string, unknown>[];
  };
  const routes = data.slice(1) as OfflineRouteRow[];
  const bundle: OfflineBundle = {
    stops: meta.stops ?? [],
    holidays: meta.holidays ?? [],
    infos: meta.infos ?? [],
    routes,
    fetchedAt: new Date().toISOString(),
  };
  await saveCachedBundle(bundle);
  return bundle;
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
