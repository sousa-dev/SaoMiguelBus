import type { MinibusTrackingMeta } from '@/lib/types';

export type TrackingFreshnessLabels = {
  relativeTime: string;
  intervalTime: string;
  isStale: boolean;
};

export type TrackingFreshnessT = {
  relative: (params: { count: number; unit: 'second' | 'minute' }) => string;
  intervalSeconds: (count: number) => string;
  intervalMinutes: (count: number) => string;
};

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;

export function formatTrackingRelativeTime(
  cachedAt: string,
  nowMs: number,
  t: TrackingFreshnessT,
): string | null {
  const parsed = Date.parse(cachedAt);
  if (Number.isNaN(parsed)) {
    return null;
  }

  const elapsedMs = Math.max(0, nowMs - parsed);
  const elapsedSeconds = Math.floor(elapsedMs / MS_PER_SECOND);

  if (elapsedSeconds < 60) {
    return t.relative({ count: elapsedSeconds, unit: 'second' });
  }

  const elapsedMinutes = Math.floor(elapsedMs / MS_PER_MINUTE);
  return t.relative({ count: elapsedMinutes, unit: 'minute' });
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
  nowMs = Date.now(),
): TrackingFreshnessLabels | null {
  if (!meta?.cachedAt) {
    return null;
  }

  const relativeTime = formatTrackingRelativeTime(meta.cachedAt, nowMs, t);
  const intervalTime = formatTrackingIntervalLabel(meta.cacheMaxAgeSeconds, t);

  if (!relativeTime && !intervalTime) {
    return null;
  }

  return {
    relativeTime: relativeTime ?? '',
    intervalTime: intervalTime ?? '',
    isStale: meta.stale === true,
  };
}
