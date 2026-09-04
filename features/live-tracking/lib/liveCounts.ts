import { staticIslandConfig } from '@/config/island';
import type { LiveVehicleCountEntry } from '@/lib/types';

export function liveVehicleCountsQueryKey(islandKey: string = staticIslandConfig.islandKey) {
  return ['live-tracking', 'v1', 'counts', islandKey] as const;
}

export type ResolvedLiveCount = {
  available: boolean;
  count: number | null;
};

/**
 * Turns one operator's cached entry into what a hub card needs: is the
 * feature worth offering, and what number (if any) goes in the subtitle.
 *
 * `unknown` -- nothing recorded yet, or it expired -- resolves as AVAILABLE
 * with no count: there is no outage evidence, just no data, and the live
 * screen probes for real the moment it is tapped. Only an explicit
 * `unavailable`/`disabled` verdict greys the card.
 */
export function resolveLiveCount(
  entry: LiveVehicleCountEntry | null | undefined,
): ResolvedLiveCount {
  if (entry == null || entry.status === 'unknown') {
    return { available: true, count: null };
  }
  if (entry.status === 'ok') {
    return { available: true, count: entry.vehicles ?? 0 };
  }
  return { available: false, count: null };
}
