import type { SeismicEvent, TrafficReport } from '@/lib/types';

/** Rolling window for “live” earthquake activity (matches hub preview). */
export const LIVE_SEISMIC_HOURS = 24;

/** Rolling window for hub traffic “reports in the last day” copy. */
export const LIVE_TRAFFIC_HOURS = 24;

export function countActiveTrafficAlerts(reports: TrafficReport[]): number {
  return reports.filter((r) => r.status === 'active').length;
}

export function countTrafficReportsInWindow(
  reports: TrafficReport[],
  hours = LIVE_TRAFFIC_HOURS,
): number {
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  return reports.filter((r) => {
    const at = Date.parse(r.createdAt);
    return Number.isFinite(at) && at >= cutoff;
  }).length;
}

export function countLiveSeismicAlerts(events: SeismicEvent[]): number {
  return events.length;
}
