import type { SeismicEvent, TrafficReport } from '@/lib/types';

/** Rolling window for “live” earthquake activity (matches hub preview). */
export const LIVE_SEISMIC_HOURS = 24;

export function countActiveTrafficAlerts(reports: TrafficReport[]): number {
  return reports.filter((r) => r.status === 'active').length;
}

export function countLiveSeismicAlerts(events: SeismicEvent[]): number {
  return events.length;
}
