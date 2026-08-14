import { formatAppDate } from '@/lib/date-format';
import type { TransitSearchResult, TripStop } from '@/lib/types';

/** Time strings from API are usually `08h30` or `08:30`. */
export function normalizeTripTime(time: string): string {
  if (time.includes('h')) {
    return time;
  }
  const [h, m] = time.split(':');
  if (h && m) {
    return `${h}h${m}`;
  }
  return time;
}

export function formatTravelDuration(firstStopTime: string, lastStopTime: string): string {
  const parse = (raw: string) => {
    const t = normalizeTripTime(raw).split('h');
    const hours = parseInt(t[0] ?? '0', 10);
    const minutes = parseInt(t[1] ?? '0', 10);
    return new Date(0, 0, 0, hours, minutes, 0);
  };

  const firstDate = parse(firstStopTime);
  const lastDate = parse(lastStopTime);
  if (lastDate.getTime() < firstDate.getTime()) {
    lastDate.setDate(lastDate.getDate() + 1);
  }

  let diff = lastDate.getTime() - firstDate.getTime();
  let hours = Math.floor(diff / 1000 / 60 / 60);
  diff -= hours * 1000 * 60 * 60;
  const minutes = Math.floor(diff / 1000 / 60);

  const hh = hours > 0 ? `${hours < 10 ? `0${hours}` : hours}h` : '';
  const mm = minutes < 10 ? `0${minutes}` : String(minutes);
  return `${hh}${mm} min`;
}

export function splitStopLabel(name: string): { title: string; subtitle: string | null } {
  const parts = name.split(' - ');
  if (parts.length <= 1) {
    return { title: name, subtitle: null };
  }
  return {
    title: parts[0] ?? name,
    subtitle: parts.slice(1).join(' - ') || null,
  };
}

export function countTransfers(route: string, stopCount: number): number {
  const raw = route.split('/').length - 1;
  return Math.min(Math.max(raw, 0), Math.max(stopCount - 2, 0));
}

export function displayRouteNumber(route: string): string {
  return route.replace(/C/gi, '');
}

/** Legacy webapp/API encodes low-confidence trips with a `C` route prefix. */
export function isCharterRoute(route: string): boolean {
  return route.includes('C');
}

/** Matches legacy search.py / webapp confirmation threshold. */
export const CONFIRMATION_LIKES_THRESHOLD = 60;

export function needsRouteConfirmation(likesPercent: number): boolean {
  return likesPercent < CONFIRMATION_LIKES_THRESHOLD;
}

export function computeVotePercents(
  likes: number,
  dislikes: number,
): { likesPercent: number; dislikesPercent: number } {
  const total = likes + dislikes;
  if (total <= 0) {
    return { likesPercent: 0, dislikesPercent: 0 };
  }
  return {
    likesPercent: Math.floor((likes / total) * 100),
    dislikesPercent: Math.floor((dislikes / total) * 100),
  };
}

/** Parse `08h30` / `08:30` into minutes since midnight. */
export function timeStringToMinutes(timeString: string): number {
  const normalized = normalizeTripTime(timeString);
  const [hours, minutes] = normalized.split('h').map((part) => parseInt(part, 10));
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

/** Segment travel duration in hours (handles overnight segments). */
export function travelDurationHours(firstStopTime: string, lastStopTime: string): number {
  const parse = (raw: string) => {
    const t = normalizeTripTime(raw).split('h');
    const hours = parseInt(t[0] ?? '0', 10);
    const minutes = parseInt(t[1] ?? '0', 10);
    return new Date(0, 0, 0, hours, minutes, 0);
  };

  const firstDate = parse(firstStopTime);
  const lastDate = parse(lastStopTime);
  if (lastDate.getTime() < firstDate.getTime()) {
    lastDate.setDate(lastDate.getDate() + 1);
  }

  const diffMs = lastDate.getTime() - firstDate.getTime();
  return diffMs / (1000 * 60 * 60);
}

export type DayType = 'weekday' | 'saturday' | 'sunday';

/** Mirrors the webapp `checkDayType`: holiday or Sunday → sunday, Saturday → saturday, else weekday. */
export function resolveDayType(
  date: Date,
  holidays?: { date: string }[],
): DayType {
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
  if (holidays?.some((holiday) => holiday.date === iso)) {
    return 'sunday';
  }
  const weekday = date.getDay();
  if (weekday === 0) {
    return 'sunday';
  }
  if (weekday === 6) {
    return 'saturday';
  }
  return 'weekday';
}

export function formatDateLabel(date: Date, _locale: string): string {
  return formatAppDate(date);
}

// Stop-name matching and segment extraction live in their own modules so that
// `lib/trip-segment.ts` can share the matcher without an import cycle. Re-exported
// here because every consumer already imports them from this path.
export { foldStopName, normalizeStopWords } from '@/lib/stop-match';
export { extractTripSegment } from '@/lib/trip-segment';
