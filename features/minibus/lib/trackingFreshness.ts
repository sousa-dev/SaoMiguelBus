import { formatLocalTime } from '@/lib/format-time';
import type { MinibusTrackingMeta } from '@/lib/types';

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
  meta: MinibusTrackingMeta | null | undefined,
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
