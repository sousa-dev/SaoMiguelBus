import {
  enqueueAnalyticsEvent,
  flushAnalyticsQueue,
} from '@/lib/analytics-queue';
import { useConsentStore } from '@/lib/consent-store';
import { getNetworkOnline } from '@/lib/network-online';

type TrackProps = Record<string, string | number | boolean | null | undefined>;

let flushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush() {
  if (!getNetworkOnline()) {
    return;
  }
  if (flushTimer) {
    clearTimeout(flushTimer);
  }
  flushTimer = setTimeout(() => {
    void flushAnalytics();
  }, 2000);
}

export function track(module: string, eventType: string, properties: TrackProps = {}) {
  if (!useConsentStore.getState().hasAnalyticsConsent()) {
    return;
  }
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (value !== undefined && value !== null) {
      cleaned[key] = value;
    }
  }
  void enqueueAnalyticsEvent(module, eventType, cleaned).then(() => {
    scheduleFlush();
  });
}

export function flushAnalytics() {
  void flushAnalyticsQueue();
}
