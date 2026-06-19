import type { MapMarkerOverlay } from '@/lib/map-overlays';
import type { MinibusNetworkStop } from '@/lib/types';

export const MINIBUS_STOP_MARKER_SIZE = 20;

export function minibusStopMarkerOverlay(
  stop: MinibusNetworkStop,
  lineColor: string,
  highlighted = false,
): MapMarkerOverlay | null {
  const lat = stop.latitude;
  const lng = stop.longitude;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return null;
  }

  return {
    id: `minibus-stop-${stop.key}`,
    latitude: lat,
    longitude: lng,
    pinColor: lineColor,
    label: String(stop.sequence),
    size: MINIBUS_STOP_MARKER_SIZE,
    highlighted,
    title: stop.name_pt,
  };
}
