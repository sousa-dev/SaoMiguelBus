/** Relative time label, e.g. "2h ago", using Intl.RelativeTimeFormat. */

const UNITS: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
  { unit: 'year', seconds: 60 * 60 * 24 * 365 },
  { unit: 'month', seconds: 60 * 60 * 24 * 30 },
  { unit: 'week', seconds: 60 * 60 * 24 * 7 },
  { unit: 'day', seconds: 60 * 60 * 24 },
  { unit: 'hour', seconds: 60 * 60 },
  { unit: 'minute', seconds: 60 },
  { unit: 'second', seconds: 1 },
];

export function formatRelativeTime(iso: string, locale?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const diffSec = Math.round((date.getTime() - Date.now()) / 1000);
  const absSec = Math.abs(diffSec);
  const resolvedLocale = locale ?? (typeof navigator !== 'undefined' ? navigator.language : 'en');

  for (const { unit, seconds } of UNITS) {
    if (absSec >= seconds || unit === 'second') {
      const value = Math.round(diffSec / seconds);
      try {
        const rtf = new Intl.RelativeTimeFormat(resolvedLocale, { numeric: 'auto' });
        return rtf.format(value, unit);
      } catch {
        return `${Math.abs(value)}${unit.charAt(0)} ago`;
      }
    }
  }

  return '';
}

/** Local clock time from ISO timestamp, e.g. "16:52". */
export function formatLocalTime(iso: string, locale?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const resolvedLocale = locale ?? (typeof navigator !== 'undefined' ? navigator.language : 'en');
  try {
    return new Intl.DateTimeFormat(resolvedLocale, { hour: '2-digit', minute: '2-digit' }).format(date);
  } catch {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }
}
