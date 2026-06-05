/** Relative time label, e.g. "2h ago", using Intl.RelativeTimeFormat. */

type RelativeTimeUnit = Intl.RelativeTimeFormatUnitSingular;

const UNITS: { unit: RelativeTimeUnit; seconds: number }[] = [
  { unit: 'year', seconds: 60 * 60 * 24 * 365 },
  { unit: 'month', seconds: 60 * 60 * 24 * 30 },
  { unit: 'week', seconds: 60 * 60 * 24 * 7 },
  { unit: 'day', seconds: 60 * 60 * 24 },
  { unit: 'hour', seconds: 60 * 60 },
  { unit: 'minute', seconds: 60 },
  { unit: 'second', seconds: 1 },
];

const COMPACT_UNIT_LABELS: Record<string, Record<RelativeTimeUnit, string>> = {
  de: { year: 'J', quarter: 'Q', month: 'Mon.', week: 'Wo.', day: 'T', hour: 'Std.', minute: 'Min.', second: 'Sek.' },
  en: { year: 'y', quarter: 'q', month: 'mo', week: 'w', day: 'd', hour: 'h', minute: 'm', second: 's' },
  es: { year: 'a', quarter: 'trim.', month: 'mes', week: 'sem.', day: 'd', hour: 'h', minute: 'min', second: 's' },
  fr: { year: 'a', quarter: 'trim.', month: 'mois', week: 'sem.', day: 'j', hour: 'h', minute: 'min', second: 's' },
  it: { year: 'a', quarter: 'trim.', month: 'mese', week: 'sett.', day: 'g', hour: 'h', minute: 'min', second: 's' },
  pt: { year: 'a', quarter: 'trim.', month: 'mês', week: 'sem.', day: 'd', hour: 'h', minute: 'min', second: 's' },
  uk: { year: 'р.', quarter: 'кв.', month: 'міс.', week: 'тиж.', day: 'д', hour: 'год', minute: 'хв', second: 'с' },
  zh: { year: '年', quarter: '季', month: '月', week: '周', day: '天', hour: '小时', minute: '分钟', second: '秒' },
};

function fallbackRelativeTime(value: number, unit: RelativeTimeUnit, locale: string): string {
  const language = locale.split(/[-_]/)[0]?.toLowerCase() ?? 'en';
  const amount = Math.abs(value);
  const label = COMPACT_UNIT_LABELS[language]?.[unit] ?? COMPACT_UNIT_LABELS.en[unit];

  if (language === 'pt') {
    return value < 0 ? `há ${amount}${label}` : `em ${amount}${label}`;
  }
  if (language === 'es') {
    return value < 0 ? `hace ${amount}${label}` : `en ${amount}${label}`;
  }
  if (language === 'fr') {
    return value < 0 ? `il y a ${amount}${label}` : `dans ${amount}${label}`;
  }
  if (language === 'it') {
    return value < 0 ? `${amount}${label} fa` : `tra ${amount}${label}`;
  }
  if (language === 'de') {
    return value < 0 ? `vor ${amount}${label}` : `in ${amount}${label}`;
  }
  if (language === 'uk') {
    return value < 0 ? `${amount}${label} тому` : `через ${amount}${label}`;
  }
  if (language === 'zh') {
    return value < 0 ? `${amount}${label}前` : `${amount}${label}后`;
  }

  return value < 0 ? `${amount}${label} ago` : `in ${amount}${label}`;
}

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
        return fallbackRelativeTime(value, unit, resolvedLocale);
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
