import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Polyline } from 'react-native-maps';

import { OsmMapView } from '@/components/OsmMapView';
import { AzoresbusVehicleMarker } from '@/features/azoresbus/components/AzoresbusVehicleMarker';
import { trackLiveMapControl } from '@/features/azoresbus/lib/live-analytics';
import {
  azoresbusVehicleColorHex,
  azoresbusVehicleLineCode,
} from '@/features/azoresbus/lib/vehicleLine';
import { azoresbusVehicleMarkerOverlay } from '@/features/azoresbus/lib/vehicle-marker-overlay';
import { fitRegionForCoordinates } from '@/features/minibus/stopCoordinates';
import { coordinateToRegion, getIslandMapRegion } from '@/lib/island-map';
import type { LatLng } from '@/lib/polyline';
import type { AzoresbusVehicleSummary } from '@/lib/types';
import { useAppTheme } from '@/lib/theme';

export type AzoresbusLiveMapHandle = {
  centerOnVehicle: (vehicle: AzoresbusVehicleSummary) => void;
  fitVehicleRoute: (options: {
    vehicle: AzoresbusVehicleSummary;
    routePolyline?: LatLng[];
    bottomInset?: number;
  }) => void;
  fitLiveOverview: (options?: { bottomInset?: number }) => void;
};

type Props = {
  vehicles: AzoresbusVehicleSummary[];
  routePolyline?: LatLng[];
  routeColor?: string | null;
  userLocationEnabled?: boolean;
  unknownLineLabel: string;
  onVehiclePress: (vehicleId: string) => void;
};

const FOCUS_DELTA = 0.012;

function vehicleCoordinates(vehicles: AzoresbusVehicleSummary[]): LatLng[] {
  return vehicles
    .map((vehicle) => {
      const lat = vehicle.position?.lat;
      const lon = vehicle.position?.lon;
      if (typeof lat !== 'number' || typeof lon !== 'number') {
        return null;
      }
      return { latitude: lat, longitude: lon };
    })
    .filter((row): row is LatLng => row !== null);
}

function fitMapToCoordinates(
  map: { fitToCoordinates?: (coords: LatLng[], options: object) => void } | null,
  coords: LatLng[],
  bottomInset: number,
) {
  if (!map?.fitToCoordinates || coords.length === 0) {
    return;
  }
  map.fitToCoordinates(coords, {
    edgePadding: { top: 56, right: 28, left: 28, bottom: 28 + bottomInset },
    animated: true,
  });
}

/**
 * The live vehicle map.
 *
 * Renders markers twice over, deliberately: iOS draws real `<Marker>` children
 * while Android is handed a serialisable `androidOverlays` payload, because the
 * Android map is a WebView that cannot host RN children. Both paths must be kept
 * in step — a marker added to only one of them silently disappears on half the
 * install base, which no simulator run on one platform will reveal.
 */
export const AzoresbusLiveMap = forwardRef<AzoresbusLiveMapHandle, Props>(
  function AzoresbusLiveMap(
    {
      vehicles,
      routePolyline,
      routeColor,
      userLocationEnabled,
      unknownLineLabel,
      onVehiclePress,
    },
    ref,
  ) {
    const theme = useAppTheme();
    const mapRef = useRef<React.ComponentRef<typeof OsmMapView> | null>(null);

    const vehicleMarkers = useMemo(
      () =>
        vehicles.map((vehicle) => ({
          vehicle,
          pinColor: azoresbusVehicleColorHex(vehicle),
          label: azoresbusVehicleLineCode(vehicle) ?? unknownLineLabel,
        })),
      [unknownLineLabel, vehicles],
    );

    const region = useMemo(() => {
      const coords = vehicleCoordinates(vehicles);
      if (routePolyline?.length) {
        coords.push(...routePolyline);
      }
      // Falls back to the whole island rather than a city: AzoresBus runs to
      // Nordeste and Povoação, so framing on Ponta Delgada would open the map
      // with half the fleet off screen.
      return coords.length ? fitRegionForCoordinates(coords) : getIslandMapRegion();
    }, [routePolyline, vehicles]);

    const strokeColor = routeColor ?? theme.primary;

    const androidOverlays = useMemo(
      () => ({
        markers: vehicleMarkers
          .map(({ vehicle, label }) =>
            azoresbusVehicleMarkerOverlay(vehicle, label, () => onVehiclePress(vehicle.id)),
          )
          .filter((marker): marker is NonNullable<typeof marker> => marker !== null),
        polylines:
          routePolyline && routePolyline.length > 1
            ? [
                {
                  id: 'azoresbus-live-route',
                  coordinates: routePolyline,
                  strokeColor,
                  strokeWidth: 4,
                },
              ]
            : [],
      }),
      [onVehiclePress, routePolyline, strokeColor, vehicleMarkers],
    );

    useImperativeHandle(
      ref,
      () => ({
        centerOnVehicle(vehicle) {
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
          fitMapToCoordinates(mapRef.current, coords, bottomInset);
        },
        fitLiveOverview({ bottomInset = 0 } = {}) {
          fitMapToCoordinates(mapRef.current, vehicleCoordinates(vehicles), bottomInset);
        },
      }),
      [vehicles],
    );

    return (
      <View style={styles.wrap}>
        <OsmMapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          showsUserLocation={userLocationEnabled}
          onMapControlPress={trackLiveMapControl}
          scrollEnabled
          zoomEnabled
          androidOverlays={androidOverlays}
        >
          {routePolyline && routePolyline.length > 1 ? (
            <Polyline coordinates={routePolyline} strokeColor={strokeColor} strokeWidth={4} />
          ) : null}
          {Platform.OS === 'ios'
            ? vehicleMarkers.map(({ vehicle, pinColor, label }) => (
                <AzoresbusVehicleMarker
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
  },
);

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  map: { flex: 1 },
});
