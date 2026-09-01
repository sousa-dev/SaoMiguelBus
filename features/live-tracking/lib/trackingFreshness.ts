import { formatLocalTime } from '@/lib/format-time';
/**
 * Freshness of a tracking payload.
 *
 * Structural rather than tied to one operator's meta: minibus is told by the
 * server when its data was cached and how often to expect more, while azoresbus
 * sends no metadata at all and has that derived on the client from the query's
 * own timestamps (`freshnessFromQuery`). Both end up here.
 */
export type TrackingFreshnessInput = {
  cachedAt: string;
  cacheMaxAgeSeconds: number;
  stale?: boolean;
};

export type TrackingFreshnessLabels = {
  updatedAtTime: string;
  intervalTime: string;
  isStale: boolean;
};

export type TrackingFreshnessT = {
  intervalSeconds: (count: number) => string;
  intervalMinutes: (count: number) => string;
};

export function formatTrackingUpdatedAtTime(cachedAt: string, locale?: string): string | null {
  const clock = formatLocalTime(cachedAt, locale);
  if (!clock) {
    return null;
  }
  return `(${clock})`;
}

export function formatTrackingIntervalLabel(
  cacheMaxAgeSeconds: number,
  t: TrackingFreshnessT,
): string | null {
  if (!Number.isFinite(cacheMaxAgeSeconds) || cacheMaxAgeSeconds <= 0) {
    return null;
  }

  if (cacheMaxAgeSeconds < 60) {
    return t.intervalSeconds(cacheMaxAgeSeconds);
  }

  const minutes = Math.round(cacheMaxAgeSeconds / 60);
  return t.intervalMinutes(minutes);
}

export function buildTrackingFreshnessLabels(
  meta: TrackingFreshnessInput | null | undefined,
  t: TrackingFreshnessT,
  locale?: string,
): TrackingFreshnessLabels | null {
  if (!meta?.cachedAt) {
    return null;
  }

  const updatedAtTime = formatTrackingUpdatedAtTime(meta.cachedAt, locale) ?? '';
  const intervalTime = formatTrackingIntervalLabel(meta.cacheMaxAgeSeconds, t) ?? '';

  if (!updatedAtTime && !intervalTime) {
    return null;
  }

  return {
    updatedAtTime,
    intervalTime,
    isStale: meta.stale === true,
  };
}


/**
 * Derive freshness from a react-query result rather than from server metadata.
 *
 * AzoresBus sends no cache meta, so "updated at" is the moment the client last
 * received an answer and the interval is the polling cadence we chose. Marked
 * stale once we are three polls late -- one missed poll is a slow network, three
 * is a feed that has stopped.
 */
export function freshnessFromQuery(
  dataUpdatedAt: number | undefined,
  pollMs: number,
  now: number,
): TrackingFreshnessInput | null {
  if (!dataUpdatedAt) {
    return null;
  }
  return {
    cachedAt: new Date(dataUpdatedAt).toISOString(),
    cacheMaxAgeSeconds: Math.round(pollMs / 1000),
    stale: now - dataUpdatedAt > pollMs * 3,
  };
}
