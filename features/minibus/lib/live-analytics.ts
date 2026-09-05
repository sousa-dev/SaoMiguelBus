import { track } from '@/lib/analytics';

import {
  liveFilterProperties,
  liveNavigateViewLineProperties,
  liveSelectStopProperties,
  liveSelectStopSequenceProperties,
  liveSelectVehicleProperties,
  type LiveFleetBarAction,
  type LiveHealthAction,
  type LiveFilterSource,
  type LiveMapControlAction,
  type LivePermissionOutcome,
  type LiveSelectSource,
} from '@/features/minibus/lib/live-analytics-props';

export type {
  LiveFilterSource,
  LiveFleetBarAction,
  LiveHealthAction,
  LiveMapControlAction,
  LivePermissionOutcome,
  LiveSelectSource,
} from '@/features/minibus/lib/live-analytics-props';

export {
  liveFilterProperties,
  liveFleetBarActionFromHeader,
  liveNavigateViewLineProperties,
  liveSelectStopProperties,
  liveSelectStopSequenceProperties,
  liveSelectVehicleProperties,
} from '@/features/minibus/lib/live-analytics-props';

const MODULE = 'minibus';

export function trackMinibusView(
  screen:
    | 'list'
    | 'search'
    | 'line'
    | 'line_map'
    | 'line_map_stop'
    | 'live'
    | 'directions'
    | 'network'
    | 'prices',
  props: Record<string, string | number | boolean> = {},
): void {
  track(MODULE, 'view', { screen, ...props });
}

export function trackLiveEntryOpen(
  source: 'hub' | 'line_detail' | 'network',
  props: { line?: string } = {},
): void {
  track(MODULE, 'live_entry_open', { source, ...props });
}

export function trackLiveFilter(lineSlug: string | null, source?: LiveFilterSource): void {
  track(MODULE, 'live_filter', liveFilterProperties(lineSlug, source));
}

export function trackLiveToggle(showStops: boolean): void {
  track(MODULE, 'live_toggle', { show_stops: showStops });
}

export function trackLiveSelectVehicle(vehicleId: string, source: LiveSelectSource): void {
  track(MODULE, 'live_select', liveSelectVehicleProperties(vehicleId, source));
}

export function trackLiveSelectStop(stopKey: string, source: LiveSelectSource = 'map'): void {
  track(MODULE, 'live_select', liveSelectStopProperties(stopKey, source));
}

export function trackLiveSelectStopSequence(sequence: number, source: LiveSelectSource): void {
  track(MODULE, 'live_select', liveSelectStopSequenceProperties(sequence, source));
}

export function trackLiveMapControl(action: LiveMapControlAction): void {
  track(MODULE, 'live_map_control', { action });
}

export function trackLiveFleetBar(action: LiveFleetBarAction): void {
  track(MODULE, 'live_fleet_bar', { action });
}

export function trackLivePermission(outcome: LivePermissionOutcome): void {
  track(MODULE, 'live_permission', { outcome });
}

export function trackLiveHealth(action: LiveHealthAction): void {
  track(MODULE, 'live_health', { action });
}

export function trackLiveNavigateViewLine(lineSlug: string): void {
  track(MODULE, 'live_navigate', liveNavigateViewLineProperties(lineSlug));
}
