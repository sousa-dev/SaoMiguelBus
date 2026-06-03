import { formatAppDate } from '@/lib/date-format';

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

export function isCharterRoute(route: string): boolean {
  return route.includes('C');
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
