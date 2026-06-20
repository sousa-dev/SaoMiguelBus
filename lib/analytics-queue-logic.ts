import type { QueuedAnalyticsEvent } from '@/lib/analytics-queue-types';

export function trimAnalyticsQueue(
  events: QueuedAnalyticsEvent[],
  maxSize: number,
): QueuedAnalyticsEvent[] {
  if (events.length <= maxSize) {
    return events;
  }
  return events.slice(events.length - maxSize);
}

export function parseAnalyticsQueue(raw: string | null): QueuedAnalyticsEvent[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as QueuedAnalyticsEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
