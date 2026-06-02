import { postAnalyticsEvents } from '@/lib/api';
import { useConsentStore } from '@/lib/consent-store';
import { getOrCreateSessionId } from '@/lib/session';

type TrackProps = Record<string, string | number | boolean | null | undefined>;

const buffer: {
  module: string;
  event_type: string;
  properties?: Record<string, unknown>;
}[] = [];

let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flush() {
  if (buffer.length === 0) {
    return;
  }
  if (!useConsentStore.getState().hasAnalyticsConsent()) {
    buffer.length = 0;
    return;
  }
  const events = buffer.splice(0, buffer.length);
  try {
    const sessionId = await getOrCreateSessionId();
    await postAnalyticsEvents(sessionId, events);
  } catch {
    buffer.unshift(...events);
  }
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
  buffer.push({ module, event_type: eventType, properties: cleaned });
  if (flushTimer) {
    clearTimeout(flushTimer);
  }
  flushTimer = setTimeout(() => {
    void flush();
  }, 2000);
}

export function flushAnalytics() {
  void flush();
}
