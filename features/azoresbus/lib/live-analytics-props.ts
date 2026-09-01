/** Pure prop builders + unions, split out so they are testable without RN. */

// 'chip' is deliberately absent: the chip row was replaced by the select
// sheet, so reporting it would attribute sheet use to a control that no
// longer exists.
export type LiveFilterSource = 'sheet' | 'deep_link' | 'clear';
export type LiveSelectSource =
  | 'map'
  | 'fleet_bar'
  | 'vehicle_sheet'
  | 'stop_search'
  | 'stop_arrivals'
  | 'stop_page'
  | 'deep_link';
export type LiveStopSearchAction = 'open' | 'select' | 'open_stop';
export type LiveArrivalsSource = 'stop_search' | 'stop_page';
export type LiveMapControlAction = 'center' | 'zoom_in' | 'zoom_out';
export type LiveFleetBarAction = 'expand' | 'collapse';

export type LiveEntryProps = {
  source: 'transit_hub';
  line?: string;
};

export function liveEntryProps(line?: string | null): Record<string, string> {
  return line ? { line } : {};
}

export function liveVehicleProps(
  vehicleId: string,
  lineCode: string | null,
): Record<string, string> {
  return { vehicle: vehicleId, line: lineCode ?? 'unknown' };
}

/**
 * What an arrivals lookup actually returned.
 *
 * `count: 0` is the interesting case and must stay distinguishable from a
 * failure: at night nothing is running, and if the two look alike in the data
 * we cannot tell "quiet stop" from "broken feed".
 */
export function arrivalsProps(
  source: LiveArrivalsSource,
  arrivals: { stale: boolean }[],
): Record<string, string> {
  return {
    source,
    count: String(arrivals.length),
    stale: String(arrivals.filter((a) => a.stale).length),
  };
}
