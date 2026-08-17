import type { JourneyMapPin } from '@/features/transit/lib/journey-map-data';
import type { MapMarkerOverlay } from '@/lib/map-overlays';

/**
 * The Android half of a journey pin.
 *
 * Every overlay has to be declared twice — as a `<Marker>` child for the iOS
 * native map and here for the Android Leaflet WebView — because
 * `mapOverlaysFromChildren` reads only plain markers and drops custom views
 * like `JourneyMapMarker`. Keeping the two in one file each, with the same
 * inputs, is what stops them drifting.
 */
export function journeyPinOverlay(
  pin: JourneyMapPin,
  highlighted = false,
  onPress?: () => void,
): MapMarkerOverlay {
  const isAction = pin.kind !== 'stop';
  return {
    id: pin.id,
    latitude: pin.coordinate.latitude,
    longitude: pin.coordinate.longitude,
    pinColor: pin.color,
    // Only the places a rider acts get a number; intermediate stops stay dots,
    // or a long route turns into an unreadable string of beads.
    ...(isAction ? { label: String(pin.step) } : {}),
    size: (isAction ? 26 : 12) + (highlighted ? 6 : 0),
    highlighted,
    title: pin.code ? `${pin.name} · ${pin.code}` : pin.name,
    ...(onPress ? { onPress } : {}),
  };
}
