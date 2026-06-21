import AsyncStorage from '@react-native-async-storage/async-storage';

import { parseAnalyticsQueue, trimAnalyticsQueue } from '@/lib/analytics-queue-logic';
import {
  ANALYTICS_QUEUE_KEY,
  BATCH_SIZE,
  FLUSH_CAP_PER_CYCLE,
  MAX_QUEUE_SIZE,
  type QueuedAnalyticsEvent,
} from '@/lib/analytics-queue-types';
import { logger } from '@/lib/logger';
import { getNetworkOnline } from '@/lib/network-online';
import { getOrCreateSessionId } from '@/lib/session';

export {
  ANALYTICS_QUEUE_KEY,
  BATCH_SIZE,
  FLUSH_CAP_PER_CYCLE,
  MAX_QUEUE_SIZE,
  type QueuedAnalyticsEvent,
} from '@/lib/analytics-queue-types';

type QueueStorage = Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'>;

let queueStorage: QueueStorage = AsyncStorage;

/** Test hook — reset to default AsyncStorage when passed null. */
export function setAnalyticsQueueStorageForTests(storage: QueueStorage | null): void {
  queueStorage = storage ?? AsyncStorage;
}

let flushInProgress = false;

export async function loadAnalyticsQueue(): Promise<QueuedAnalyticsEvent[]> {
  const raw = await queueStorage.getItem(ANALYTICS_QUEUE_KEY);
  return parseAnalyticsQueue(raw);
}

async function saveAnalyticsQueue(events: QueuedAnalyticsEvent[]): Promise<void> {
  await queueStorage.setItem(ANALYTICS_QUEUE_KEY, JSON.stringify(events));
}

function trimQueue(events: QueuedAnalyticsEvent[]): QueuedAnalyticsEvent[] {
  if (events.length <= MAX_QUEUE_SIZE) {
    return events;
  }
  const dropped = events.length - MAX_QUEUE_SIZE;
  logger.warn(`analytics queue overflow — dropping ${dropped} oldest events`);
  return trimAnalyticsQueue(events, MAX_QUEUE_SIZE);
}

export async function purgeAnalyticsQueue(): Promise<void> {
  await queueStorage.removeItem(ANALYTICS_QUEUE_KEY);
}

export async function enqueueAnalyticsEvent(
  module: string,
  eventType: string,
  properties: Record<string, unknown> = {},
): Promise<void> {
  const queue = await loadAnalyticsQueue();
  queue.push({
    module,
    event_type: eventType,
    properties,
    occurred_at: new Date().toISOString(),
  });
  await saveAnalyticsQueue(trimQueue(queue));
}

export async function flushAnalyticsQueue(): Promise<number> {
  if (flushInProgress) {
    return 0;
  }
  const { useConsentStore } = await import('@/lib/consent-store');
  if (!useConsentStore.getState().hasAnalyticsConsent()) {
    await purgeAnalyticsQueue();
    return 0;
  }
  // Don't flush during an admin session, but keep any genuine pre-login queue.
  const { isAdminUser } = await import('@/lib/auth-store');
  if (isAdminUser()) {
    return 0;
  }
  if (!getNetworkOnline()) {
    return 0;
  }

  flushInProgress = true;
  let totalSent = 0;
  try {
    const { postAnalyticsEvents } = await import('@/lib/api');
    const sessionId = await getOrCreateSessionId();
    while (totalSent < FLUSH_CAP_PER_CYCLE) {
      const queue = await loadAnalyticsQueue();
      if (queue.length === 0) {
        break;
      }
      const batch = queue.slice(0, BATCH_SIZE);
      try {
        await postAnalyticsEvents(sessionId, batch);
        const remaining = queue.slice(batch.length);
        await saveAnalyticsQueue(remaining);
        totalSent += batch.length;
      } catch (error) {
        logger.warn('analytics flush failed — keeping queued events', error);
        break;
      }
    }
  } finally {
    flushInProgress = false;
  }
  return totalSent;
}
