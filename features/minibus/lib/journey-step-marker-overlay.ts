import type { JourneyMapMarker } from '@/features/minibus/journeySteps';
import { MINIBUS_STOP_MARKER_SIZE } from '@/features/minibus/lib/minibus-stop-marker-overlay';
import type { MapMarkerOverlay } from '@/lib/map-overlays';

export function journeyStepMarkerOverlay(
  marker: JourneyMapMarker,
  highlighted = false,
): MapMarkerOverlay {
  return {
    id: `journey-step-${marker.id}`,
    latitude: marker.coordinate.latitude,
    longitude: marker.coordinate.longitude,
    pinColor: marker.color,
    label: String(marker.stepNumber),
    size: highlighted ? MINIBUS_STOP_MARKER_SIZE + 4 : MINIBUS_STOP_MARKER_SIZE,
    highlighted,
    title: marker.title,
  };
}
