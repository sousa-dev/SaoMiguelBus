import {
  buildTrackingFreshnessLabels,
  freshnessFromQuery,
  type TrackingFreshnessLabels,
  type TrackingFreshnessT,
} from '@/features/live-tracking/lib/trackingFreshness';
import { AZORESBUS_TRACKING_POLL_MS } from '@/features/azoresbus/lib/trackingPollInterval';

/**
 * Freshness without server help.
 *
 * The AzoresBus API sends no `cachedAt`/`cacheMaxAgeSeconds`, so "updated at" is
 * when react-query last received an answer and the interval is our own polling
 * cadence. Honest, and the only thing available.
 */
export function azoresbusFreshnessLabels(
  dataUpdatedAt: number | undefined,
  t: TrackingFreshnessT,
  now: number,
  locale?: string,
): TrackingFreshnessLabels | null {
  const meta = freshnessFromQuery(dataUpdatedAt, AZORESBUS_TRACKING_POLL_MS, now);
  return buildTrackingFreshnessLabels(meta, t, locale);
}

export function azoresbusIsStale(
  dataUpdatedAt: number | undefined,
  now: number,
): boolean {
  return (
    freshnessFromQuery(dataUpdatedAt, AZORESBUS_TRACKING_POLL_MS, now)?.stale === true
  );
}
