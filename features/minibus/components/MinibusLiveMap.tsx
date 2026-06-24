import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Polyline } from 'react-native-maps';

import { OsmMapView } from '@/components/OsmMapView';
import { MinibusLiveStopsToggle } from '@/features/minibus/components/MinibusLiveStopsToggle';
import { MinibusStopMarker } from '@/features/minibus/components/MinibusStopMarker';
import { MinibusVehicleMarker } from '@/features/minibus/components/MinibusVehicleMarker';
import type { MinibusLiveMapStopPin } from '@/features/minibus/lib/liveNetworkMapStops';
import { minibusStopMarkerOverlay } from '@/features/minibus/lib/minibus-stop-marker-overlay';
import {
  resolveLineForVehicle,
  vehicleLineColorHex,
} from '@/features/minibus/lib/vehicleColor';
import { vehicleMarkerOverlay } from '@/features/minibus/lib/vehicle-marker-overlay';
import { fitRegionForCoordinates } from '@/features/minibus/stopCoordinates';
import { coordinateToRegion, getIslandMapRegion, saoMiguelMapBounds } from '@/lib/island-map';
import type { LatLng } from '@/lib/polyline';
import { space } from '@/lib/tokens';
import type { MinibusLine, MinibusNetworkStop, MinibusVehicleSummary } from '@/lib/types';
import { useAppTheme } from '@/lib/theme';

export type MinibusLiveMapHandle = {
  centerOnVehicle: (vehicle: MinibusVehicleSummary) => void;
  centerOnStop: (stop: MinibusNetworkStop) => void;
  fitVehicleRoute: (options: {
    vehicle: MinibusVehicleSummary;
    routePolyline?: LatLng[];
    bottomInset?: number;
  }) => void;
};

type Props = {
  vehicles: MinibusVehicleSummary[];
  lines: MinibusLine[];
  networkStops: MinibusLiveMapStopPin[];
  showStops?: boolean;
  hideStops?: boolean;
  onHideStopsChange?: (hideStops: boolean) => void;
  showStopsToggle?: boolean;
  routePolyline?: LatLng[];
  routeColor?: string | null;
  highlightedStopKey?: string | null;
  onVehiclePress: (vehicleId: string) => void;
  onStopPress: (stopKey: string) => void;
};

const FOCUS_DELTA = 0.012;
const LIVE_VIEWPORT_PAD = 0.08;

export const MinibusLiveMap = forwardRef<MinibusLiveMapHandle, Props>(function MinibusLiveMap(
  {
    vehicles,
    lines,
    networkStops,
    showStops = true,
    hideStops = false,
    onHideStopsChange,
    showStopsToggle = true,
    routePolyline,
    routeColor,
    highlightedStopKey = null,
    onVehiclePress,
    onStopPress,
  },
  ref,
) {
  const theme = useAppTheme();
  const mapRef = useRef<React.ElementRef<typeof OsmMapView>>(null);

  const vehicleMarkers = useMemo(
    () =>
      vehicles.map((vehicle) => {
        const line = resolveLineForVehicle(vehicle, lines);
        const pinColor = vehicleLineColorHex(vehicle, lines);
        const label = line?.code ?? vehicle.id;
        return { vehicle, pinColor, label };
      }),
    [lines, vehicles],
  );

  const region = useMemo(() => {
    const coords = vehicles
      .map((v) => {
        const lat = v.position?.lat;
        const lon = v.position?.lon;
        if (typeof lat !== 'number' || typeof lon !== 'number') {
          return null;
        }
        return { latitude: lat, longitude: lon };
      })
      .filter((row): row is LatLng => row !== null);

    if (routePolyline?.length) {
      coords.push(...routePolyline);
    }

    if (coords.length) {
      return fitRegionForCoordinates(coords);
    }
    return getIslandMapRegion(saoMiguelMapBounds, LIVE_VIEWPORT_PAD);
  }, [routePolyline, vehicles]);

  const strokeColor = routeColor ?? theme.primary;
  const visibleStops = showStops ? networkStops : [];

  const androidOverlays = useMemo(
    () => ({
      markers: [
        ...visibleStops
          .map((pin) =>
            minibusStopMarkerOverlay(
              pin.stop,
              pin.lineColor,
              pin.stop.key === highlightedStopKey,
              () => onStopPress(pin.stop.key),
            ),
          )
          .filter((marker): marker is NonNullable<typeof marker> => marker !== null),
        ...vehicleMarkers
          .map(({ vehicle, pinColor, label }) =>
            vehicleMarkerOverlay(vehicle, pinColor, label, () => onVehiclePress(vehicle.id)),
          )
          .filter((marker): marker is NonNullable<typeof marker> => marker !== null),
      ],
      polylines:
        routePolyline && routePolyline.length > 1
          ? [
              {
                id: 'live-route',
                coordinates: routePolyline,
                strokeColor,
                strokeWidth: 4,
              },
            ]
          : [],
    }),
    [
      highlightedStopKey,
      onStopPress,
      onVehiclePress,
      routePolyline,
      strokeColor,
      vehicleMarkers,
      visibleStops,
    ],
  );

  useImperativeHandle(ref, () => ({
    centerOnVehicle(vehicle: MinibusVehicleSummary) {
      const lat = vehicle.position?.lat;
      const lon = vehicle.position?.lon;
      if (typeof lat !== 'number' || typeof lon !== 'number') {
        return;
      }
      mapRef.current?.animateToRegion(
        coordinateToRegion({ lat, lng: lon }, FOCUS_DELTA),
        350,
      );
    },
    centerOnStop(stop: MinibusNetworkStop) {
      const lat = stop.latitude;
      const lon = stop.longitude;
      if (typeof lat !== 'number' || typeof lon !== 'number') {
        return;
      }
      mapRef.current?.animateToRegion(
        coordinateToRegion({ lat, lng: lon }, FOCUS_DELTA),
        350,
      );
    },
    fitVehicleRoute({ vehicle, routePolyline: route, bottomInset = 0 }) {
      const coords: LatLng[] = [];
      if (route?.length) {
        coords.push(...route);
      }
      const lat = vehicle.position?.lat;
      const lon = vehicle.position?.lon;
      if (typeof lat === 'number' && typeof lon === 'number') {
        coords.push({ latitude: lat, longitude: lon });
      }
      if (!coords.length) {
        return;
      }

      const edgePadding = {
        top: 56,
        right: 28,
        bottom: bottomInset + 28,
        left: 28,
      };
      const map = mapRef.current;
      if (map && 'fitToCoordinates' in map && typeof map.fitToCoordinates === 'function') {
        map.fitToCoordinates(coords, { edgePadding, animated: true });
        return;
      }

      const region = fitRegionForCoordinates(coords, 0.018);
      if (bottomInset > 0) {
        region.latitude += region.latitudeDelta * 0.12;
      }
      map?.animateToRegion(region, 350);
    },
  }));

  return (
    <View style={styles.wrap}>
      <OsmMapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        showsUserLocation
        scrollEnabled
        zoomEnabled
        androidOverlays={androidOverlays}
      >
        {routePolyline && routePolyline.length > 1 ? (
          <Polyline coordinates={routePolyline} strokeColor={strokeColor} strokeWidth={4} />
        ) : null}
        {Platform.OS === 'ios'
          ? visibleStops.map((pin) => (
              <MinibusStopMarker
                key={pin.stop.key}
                stop={pin.stop}
                lineColor={pin.lineColor}
                highlighted={pin.stop.key === highlightedStopKey}
                onPress={() => onStopPress(pin.stop.key)}
              />
            ))
          : null}
        {Platform.OS === 'ios'
          ? vehicleMarkers.map(({ vehicle, pinColor, label }) => (
              <MinibusVehicleMarker
                key={vehicle.id}
                vehicle={vehicle}
                pinColor={pinColor}
                label={label}
                onPress={() => onVehiclePress(vehicle.id)}
              />
            ))
          : null}
      </OsmMapView>
      {onHideStopsChange && showStopsToggle ? (
        <View style={styles.overlayTopLeft} pointerEvents="box-none">
          <MinibusLiveStopsToggle hideStops={hideStops} onHideStopsChange={onHideStopsChange} />
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  overlayTopLeft: {
    position: 'absolute',
    top: space.sm,
    left: space.sm,
  },
});
