import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Polyline } from 'react-native-maps';

import { OsmMapView } from '@/components/OsmMapView';
import { MinibusVehicleMarker } from '@/features/minibus/components/MinibusVehicleMarker';
import {
  resolveLineForVehicle,
  vehicleLineColorHex,
} from '@/features/minibus/lib/vehicleColor';
import { vehicleMarkerOverlay } from '@/features/minibus/lib/vehicle-marker-overlay';
import { fitRegionForCoordinates } from '@/features/minibus/stopCoordinates';
import { coordinateToRegion, getIslandMapRegion, saoMiguelMapBounds } from '@/lib/island-map';
import type { LatLng } from '@/lib/polyline';
import type { MinibusLine, MinibusVehicleSummary } from '@/lib/types';
import { useAppTheme } from '@/lib/theme';

export type MinibusLiveMapHandle = {
  centerOnVehicle: (vehicle: MinibusVehicleSummary) => void;
};

type Props = {
  vehicles: MinibusVehicleSummary[];
  lines: MinibusLine[];
  routePolyline?: LatLng[];
  routeColor?: string | null;
  onVehiclePress: (vehicleId: string) => void;
};

const FOCUS_DELTA = 0.012;
const LIVE_VIEWPORT_PAD = 0.08;

export const MinibusLiveMap = forwardRef<MinibusLiveMapHandle, Props>(function MinibusLiveMap(
  { vehicles, lines, routePolyline, routeColor, onVehiclePress },
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

  const androidOverlays = useMemo(
    () => ({
      markers: vehicleMarkers
        .map(({ vehicle, pinColor, label }) =>
          vehicleMarkerOverlay(vehicle, pinColor, label, () => onVehiclePress(vehicle.id)),
        )
        .filter((marker): marker is NonNullable<typeof marker> => marker !== null),
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
    [onVehiclePress, routePolyline, strokeColor, vehicleMarkers],
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
});
