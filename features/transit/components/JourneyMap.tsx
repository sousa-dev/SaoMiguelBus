import React, {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  type ElementRef,
} from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Polyline } from 'react-native-maps';
import { useTranslation } from 'react-i18next';
import { CloudOff, Map as MapIcon } from 'lucide-react-native';

import { OsmMapView } from '@/components/OsmMapView';
import { AzoresbusVehicleMarker } from '@/features/azoresbus/components/AzoresbusVehicleMarker';
import { AZORESBUS_VEHICLE_MARKER_SIZE } from '@/features/azoresbus/lib/vehicle-marker-overlay';
import { JourneyMapMarker } from '@/features/transit/components/JourneyMapMarker';
import { useJourneyGeometry } from '@/features/transit/hooks/useJourneyGeometry';
import {
  buildJourneyMapData,
  isMappable,
  journeyMapCoordinates,
  type JourneyMapPin,
} from '@/features/transit/lib/journey-map-data';
import type { JourneyLiveVehicle } from '@/features/transit/lib/journey-live-markers';
import { journeyPinOverlay } from '@/features/transit/lib/journey-pin-overlay';
import { vehicleMarkerOverlay } from '@/features/live-tracking/lib/vehicle-marker-overlay';
import { coordinateToRegion, fitRegionForCoordinates } from '@/lib/island-map';
import type { MapOverlaySpec } from '@/lib/map-overlays';
import { useNetwork } from '@/lib/network-provider';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { TransitJourney } from '@/lib/types';

const PREVIEW_HEIGHT = 200;

/**
 * How tight the map goes when a stop is picked. Close enough to see which side
 * of the road the pole is on — the question the stop page then answers in full.
 */
const FOCUS_DELTA = 0.0035;

export type JourneyMapHandle = {
  focusStop: (pin: JourneyMapPin) => void;
};

type Props = {
  journey: TransitJourney;
  /** `preview` sits in the card and is not interactive; `full` fills a screen. */
  variant?: 'preview' | 'full';
  highlightedStopId?: number | null;
  onStopPress?: (pin: JourneyMapPin) => void;
  onPress?: () => void;
  /** The real bus behind a ride leg, when the AVL feed could attribute one. */
  liveVehicles?: JourneyLiveVehicle[];
};

/**
 * A journey drawn on a map: the real road path per leg, and its stops.
 *
 * Renders nothing at all when there is no geometry — which is every legacy
 * journey, since that network has neither road shapes nor pole positions. That
 * is deliberate: the alternative is joining stops with straight lines, and on
 * legacy's 108 village-level stops that draws a 12.9 km line from Vila Franca
 * to Furnas straight through the caldera. A rider would believe it.
 */
export const JourneyMap = forwardRef<JourneyMapHandle, Props>(function JourneyMap(
  { journey, variant = 'full', highlightedStopId = null, onStopPress, onPress, liveVehicles = [] },
  ref,
) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { isOnline } = useNetwork();
  const mapRef = useRef<ElementRef<typeof OsmMapView>>(null);

  const { geometries, isLoading } = useJourneyGeometry(journey, isOnline);
  const data = useMemo(
    () => buildJourneyMapData(journey, geometries),
    [journey, geometries],
  );
  const region = useMemo(
    () => fitRegionForCoordinates(journeyMapCoordinates(data), 0.01),
    [data],
  );

  const androidOverlays = useMemo(
    (): MapOverlaySpec => ({
      markers: [
        ...data.pins.map((pin) =>
          journeyPinOverlay(
            pin,
            pin.stopId === highlightedStopId,
            onStopPress ? () => onStopPress(pin) : undefined,
          ),
        ),
        ...liveVehicles.flatMap((vehicle) => {
          const marker = vehicleMarkerOverlay(vehicle, vehicle.color, vehicle.label, {
            idPrefix: 'transit-live',
            size: AZORESBUS_VEHICLE_MARKER_SIZE,
            pulsing: true,
          });
          return marker ? [marker] : [];
        }),
      ],
      polylines: data.lines.map((line) => ({
        id: line.id,
        coordinates: line.coordinates,
        strokeColor: line.color,
        strokeWidth: variant === 'preview' ? 4 : 5,
      })),
    }),
    [data, highlightedStopId, liveVehicles, onStopPress, variant],
  );

  useImperativeHandle(ref, () => ({
    focusStop(pin: JourneyMapPin) {
      mapRef.current?.animateToRegion(
        coordinateToRegion(
          { lat: pin.coordinate.latitude, lng: pin.coordinate.longitude },
          FOCUS_DELTA,
        ),
        350,
      );
    },
  }));

  // Tiles come over the network and on Android so does Leaflet itself, so an
  // offline map is a grey box. Say why instead of showing one.
  if (!isOnline) {
    return (
      <Notice
        icon={CloudOff}
        text={t('transitMapOffline')}
        height={variant === 'preview' ? PREVIEW_HEIGHT : undefined}
      />
    );
  }

  if (isLoading) {
    return (
      <View
        style={[
          styles.notice,
          variant === 'preview' ? { height: PREVIEW_HEIGHT } : styles.fill,
          { borderColor: theme.border, backgroundColor: theme.surfaceVariant },
        ]}
      >
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (!isMappable(data)) {
    return variant === 'preview' ? null : (
      <Notice icon={MapIcon} text={t('transitMapUnavailable')} />
    );
  }

  const map = (
    <OsmMapView
      ref={mapRef}
      style={styles.fill}
      initialRegion={region}
      scrollEnabled={variant === 'full'}
      zoomEnabled={variant === 'full'}
      androidOverlays={androidOverlays}
      accessibilityLabel={t('transitMapA11y')}
    >
      {data.lines.map((line) => (
        <Polyline
          key={line.id}
          coordinates={line.coordinates}
          strokeColor={line.color}
          strokeWidth={variant === 'preview' ? 4 : 5}
        />
      ))}
      {/* iOS only: these are custom views, which the Android extractor drops —
          Android gets the same pins through `androidOverlays` above. */}
      {Platform.OS === 'ios'
        ? data.pins.map((pin) => (
            <JourneyMapMarker
              key={pin.id}
              pin={pin}
              highlighted={pin.stopId === highlightedStopId}
              onPress={onStopPress ? () => onStopPress(pin) : undefined}
            />
          ))
        : null}
      {Platform.OS === 'ios'
        ? liveVehicles.map((vehicle) => (
            <AzoresbusVehicleMarker
              key={`live-${vehicle.id}`}
              vehicle={vehicle}
              pinColor={vehicle.color}
              label={vehicle.label}
              pulsing
            />
          ))
        : null}
    </OsmMapView>
  );

  if (variant === 'preview') {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t('transitOpenMap')}
        style={[styles.mapFrame, { height: PREVIEW_HEIGHT, borderColor: theme.border }]}
        // The preview is a button, not a map: let the tap through to onPress
        // instead of letting the map swallow it as a pan.
        pointerEvents="box-only"
      >
        {map}
      </Pressable>
    );
  }

  return <View style={styles.fill}>{map}</View>;
});

function Notice({
  icon: Icon,
  text,
  height,
}: {
  icon: typeof CloudOff;
  text: string;
  height?: number;
}) {
  const theme = useAppTheme();
  return (
    <View
      style={[
        styles.notice,
        height ? { height } : styles.fill,
        { borderColor: theme.border, backgroundColor: theme.surfaceVariant },
      ]}
    >
      <Icon size={22} color={theme.muted} />
      <Text
        style={[
          typography.caption,
          { color: theme.muted, marginTop: space.sm, textAlign: 'center' },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  /**
   * The MAP frame carries no centring and no padding, and that is load-bearing.
   * `alignItems: 'center'` sizes the cross axis to content, and a `MapView` with
   * `flex: 1` has no intrinsic width — so it collapses to zero width and renders
   * nothing while the absolutely-positioned zoom controls and loading spinner
   * keep painting, which looks exactly like a map that never finishes loading.
   */
  mapFrame: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  /** Text/spinner boxes, which DO want their content centred. */
  notice: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.md,
  },
});
