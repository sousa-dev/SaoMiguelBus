export type LiveFilterSource = 'chip' | 'deep_link' | 'stops_toggle';

export type LiveSelectSource = 'map' | 'fleet_bar' | 'vehicle_sheet';

export type LiveMapControlAction = 'center' | 'zoom_in' | 'zoom_out';

export type LiveFleetBarAction = 'expand' | 'collapse' | 'clear_vehicle';

export type LivePermissionOutcome = 'granted' | 'denied';

export type LiveHealthAction = 'retry';

export function liveFilterProperties(
  lineSlug: string | null,
  source?: LiveFilterSource,
): Record<string, string> {
  const properties: Record<string, string> = { line_slug: lineSlug ?? 'all' };
  if (source) {
    properties.source = source;
  }
  return properties;
}

export function liveSelectVehicleProperties(
  vehicleId: string,
  source: LiveSelectSource,
): Record<string, string> {
  return { vehicle_id: vehicleId, source };
}

export function liveSelectStopProperties(
  stopKey: string,
  source: LiveSelectSource = 'map',
): Record<string, string> {
  return { stop_key: stopKey, source };
}

export function liveSelectStopSequenceProperties(
  sequence: number,
  source: LiveSelectSource,
): Record<string, string | number> {
  return { stop_sequence: sequence, source };
}

export function liveNavigateViewLineProperties(lineSlug: string): Record<string, string> {
  return {
    action: 'view_line',
    line_slug: lineSlug,
    source: 'stop_sheet',
  };
}

export function liveFleetBarActionFromHeader(
  expanded: boolean,
  clearingVehicle: boolean,
): LiveFleetBarAction {
  if (expanded) {
    return 'collapse';
  }
  if (clearingVehicle) {
    return 'clear_vehicle';
  }
  return 'expand';
}
