import type { MinibusTrackingMeta } from '@/lib/types';

/** Only used when the server sends no meta; mirrors MINIBUS_TRACKING_CACHE_TTL. */
const DEFAULT_POLL_MS = 60_000;

export function minibusTrackingPollIntervalMs(meta?: MinibusTrackingMeta | null): number {
  const seconds = meta?.cacheMaxAgeSeconds;
  if (typeof seconds === 'number' && seconds > 0) {
    return seconds * 1000;
  }
  return DEFAULT_POLL_MS;
}

export function minibusTrackingStaleTimeMs(meta?: MinibusTrackingMeta | null): number {
  return minibusTrackingPollIntervalMs(meta);
}
