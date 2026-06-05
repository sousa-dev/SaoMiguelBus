import type { MapMarkerOverlay } from '@/lib/map-overlays';
import { magnitudeColor } from '@/lib/seismic-colors';
import type { AppTheme } from '@/lib/theme';
import type { SeismicEvent } from '@/lib/types';

export function seismicMarkerOverlay(
  event: SeismicEvent,
  theme: AppTheme,
  onPress?: () => void,
): MapMarkerOverlay {
  return {
    id: `seismic-${event.id}`,
    latitude: event.latitude,
    longitude: event.longitude,
    pinColor: magnitudeColor(theme, event.magnitude),
    title: `M${event.magnitude.toFixed(1)}`,
    onPress,
  };
}
