import { track } from '@/lib/analytics';

import type {
  LiveArrivalsSource,
  LiveFilterSource,
  LiveFleetBarAction,
  LiveMapControlAction,
  LiveSelectSource,
  LiveStopSearchAction,
} from '@/features/azoresbus/lib/live-analytics-props';
import { arrivalsProps } from '@/features/azoresbus/lib/live-analytics-props';

const MODULE = 'azoresbus';

export function trackAzoresbusView(screen: string, props: Record<string, string> = {}) {
  track(MODULE, 'view', { screen, ...props });
}

export function trackLiveEntryOpen(source: 'transit_hub', props: Record<string, string> = {}) {
  track(MODULE, 'live_entry_open', { source, ...props });
}

export function trackLiveFilter(source: LiveFilterSource, line: string | null) {
  track(MODULE, 'live_filter', { source, line: line ?? 'all' });
}

export function trackLiveSelectVehicle(source: LiveSelectSource, props: Record<string, string> = {}) {
  track(MODULE, 'live_select', { kind: 'vehicle', source, ...props });
}

export function trackLiveSelectStop(source: LiveSelectSource, props: Record<string, string> = {}) {
  track(MODULE, 'live_select', { kind: 'stop', source, ...props });
}

export function trackLiveHealth(action: 'retry', props: Record<string, string> = {}) {
  track(MODULE, 'live_health', { action, ...props });
}

export function trackLiveMapControl(action: LiveMapControlAction): void {
  track(MODULE, 'live_map_control', { action });
}

export function trackLiveFleetBar(action: LiveFleetBarAction): void {
  track(MODULE, 'live_fleet_bar', { action });
}

/** Opening the stop finder, choosing a stop, and leaving for the stop page. */
export function trackLiveStopSearch(
  action: LiveStopSearchAction,
  props: Record<string, string> = {},
): void {
  track(MODULE, 'live_stop_search', { action, ...props });
}

export function trackLiveArrivals(
  source: LiveArrivalsSource,
  arrivals: { stale: boolean }[],
): void {
  track(MODULE, 'live_arrivals', arrivalsProps(source, arrivals));
}

/** Opening or clearing the line filter, as distinct from changing it. */
export function trackLiveFilterSheet(action: 'open' | 'clear'): void {
  track(MODULE, 'live_filter_sheet', { action });
}
