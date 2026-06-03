import React, { useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { decodePolyline, type LatLng } from '@/lib/polyline';
import { radius, space } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { DirectionsRoute } from '@/lib/types';

// São Miguel island center — fallback when a route has no polyline.
const FALLBACK_REGION = {
  latitude: 37.7779,
  longitude: -25.5006,
  latitudeDelta: 0.6,
  longitudeDelta: 0.6,
};

const WALK_COLOR = '#e53935';
const TRANSIT_COLOR = '#1e88e5';

type Props = {
  route: DirectionsRoute;
};

export function RouteMap({ route }: Props) {
  const theme = useAppTheme();
  const mapRef = useRef<MapView>(null);

  const leg = route.legs?.[0];

  const { walkSegments, transitSegments, allCoords } = useMemo(() => {
    const walk: LatLng[][] = [];
    const transit: LatLng[][] = [];
    const all: LatLng[] = [];
    (leg?.steps ?? []).forEach((step) => {
      const points = step.polyline?.points;
      if (!points) {
        return;
      }
      const coords = decodePolyline(points);
      if (coords.length === 0) {
        return;
      }
      all.push(...coords);
      if (step.travel_mode === 'WALKING') {
        walk.push(coords);
      } else if (step.travel_mode === 'TRANSIT') {
        transit.push(coords);
      }
    });
    return { walkSegments: walk, transitSegments: transit, allCoords: all };
  }, [leg]);

  const overview = useMemo(
    () => decodePolyline(route.overview_polyline?.points ?? ''),
    [route.overview_polyline?.points],
  );

  const start = overview[0] ?? allCoords[0];
  const end = overview[overview.length - 1] ?? allCoords[allCoords.length - 1];

  const fit = () => {
    const coords = allCoords.length > 0 ? allCoords : overview;
    if (coords.length > 1 && mapRef.current) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
        animated: false,
      });
    }
  };

  return (
    <View style={[styles.wrap, { borderColor: theme.border }]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={FALLBACK_REGION}
        onMapReady={fit}
        pointerEvents="auto"
      >
        {walkSegments.map((coords, i) => (
          <Polyline key={`walk-${i}`} coordinates={coords} strokeColor={WALK_COLOR} strokeWidth={4} />
        ))}
        {transitSegments.map((coords, i) => (
          <Polyline key={`transit-${i}`} coordinates={coords} strokeColor={TRANSIT_COLOR} strokeWidth={5} />
        ))}
        {start ? (
          <Marker coordinate={start} title={leg?.start_address?.split(',')[0]} pinColor="green" />
        ) : null}
        {end ? <Marker coordinate={end} title={leg?.end_address?.split(',')[0]} pinColor="red" /> : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 280,
    width: '100%',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginTop: space.md,
  },
});
