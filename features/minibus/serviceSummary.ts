import type { MinibusServiceSummary } from '@/lib/types';

export function formatServiceSummary(
  summary: MinibusServiceSummary,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  const weekday = summary.weekday;
  const weekdayText =
    weekday?.start && weekday?.end
      ? t('minibusWeekdayHours', { start: weekday.start, end: weekday.end })
      : '';

  const saturday = summary.saturday_departures?.filter(Boolean) ?? [];
  if (saturday.length === 0) {
    return weekdayText;
  }

  const saturdayText = t('minibusSaturdayDepartures', { times: saturday.join(', ') });
  return weekdayText ? `${weekdayText} · ${saturdayText}` : saturdayText;
}
