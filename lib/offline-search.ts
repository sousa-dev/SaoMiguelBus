/**
 * Pure offline route search over the v1 bundle. Split out of
 * `lib/offline-bundle.ts` so it carries no AsyncStorage or network imports and
 * can be tested directly.
 *
 * Pair selection is shared with the online path (`lib/trip-segment.ts`): the
 * `indexOf` matching this replaces had the same first-occurrence bug as the
 * server and `extractTripSegment`, so a loop's later leg was filtered out
 * (98 B7). Online and offline must agree on the pair or they disagree on exactly
 * the routes that are hardest to notice.
 */

import { selectPair, stopTimeMinutes, type SequencedStop } from '@/lib/trip-segment';
import type { TransitSearchResult, TripStop } from '@/lib/types';

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

export function normalizeStopKey(str: string): string {
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

/** Local calendar date as `YYYY-MM-DD`, matching `resolveDayType`. */
function localIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function dayTypeToWeekday(
  day: string,
  holidays: OfflineHoliday[],
  referenceDate = new Date(),
): string {
  // Compare calendar dates as strings. `new Date('2026-12-08')` parses as UTC
  // midnight, so reading its LOCAL parts yields 7 December anywhere west of
  // UTC — including Atlantic/Azores, the timezone this app serves. That made
  // every holiday resolve one day early. `resolveDayType` already does it this
  // way (lib/transit-format.ts).
  const today = localIsoDate(referenceDate);
  const isHoliday = holidays.some((h) => h.date.slice(0, 10) === today);
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

/** `08h30` / `08:30` -> minutes since midnight. v1 rows carry no day offset. */
function rowMinutes(time: string): number {
  const [hours, minutes] = time.replace('h', ':').split(':').map((part) => parseInt(part, 10));
  return stopTimeMinutes(0, Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0);
}

function sequencedStops(row: OfflineRouteRow): SequencedStop[] {
  return row.stops.map((name, index) => ({
    key: normalizeStopKey(name),
    sequence: index + 1,
    minutes: rowMinutes(row.times[index] ?? ''),
  }));
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
    route: String(row.route),
    origin: originalOrigin,
    destination: originalDestination,
    start: row.times[originIndex] ?? '',
    end: row.times[destIndex] ?? '',
    typeOfDay: dayOfWeek,
    likesPercent: row.likes_percent ?? 0,
    dislikesPercent: row.dislikes_percent ?? 0,
    information: info as Record<string, unknown>,
    stops: segmentStops,
    // Offline rows are ordered arrays, never round-tripped through a dict, so
    // the positions are always trustworthy.
    segmentExact: true,
  };
}

export function offlineSearch(
  bundle: OfflineBundle,
  params: {
    origin: string;
    destination: string;
    day: string;
    now?: Date;
  },
): TransitSearchResult[] {
  const originKey = normalizeStopKey(params.origin);
  const destKey = normalizeStopKey(params.destination);
  const dayOfWeek = dayTypeToWeekday(params.day, bundle.holidays, params.now ?? new Date());

  const results: TransitSearchResult[] = [];
  for (const row of bundle.routes) {
    if (row.weekday !== dayOfWeek) {
      continue;
    }
    // v1 (already-installed builds) is frozen — no area-search here, ever.
    // Just the mechanical singleton-Set wrap the generalized signature needs.
    const pair = selectPair(sequencedStops(row), new Set([originKey]), new Set([destKey]));
    if (!pair) {
      continue;
    }
    const [board, alight] = pair;
    results.push(
      mapRowToResult(
        row,
        board.sequence - 1,
        alight.sequence - 1,
        params.origin,
        params.destination,
        dayOfWeek,
      ),
    );
  }
  return results;
}
