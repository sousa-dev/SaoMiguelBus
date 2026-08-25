import { MapPin } from 'lucide-react-native';
import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Marker, type Region } from 'react-native-maps';

import { OsmMapView } from '@/components/OsmMapView';
import { TrafficMapMarker } from '@/features/traffic/components/TrafficMapMarker';
import { trafficMarkerOverlay } from '@/features/traffic/lib/traffic-marker-overlay';
import {
  clampCoordinate,
  clampMapRegion,
  coordinateToRegion,
  getIslandMapRegion,
  isWithinIslandBounds,
  regionNeedsClamp,
  saoMiguelMapBounds,
  trafficMapViewportPad,
} from '@/lib/island-map';
import type { AppTheme } from '@/lib/theme';
import type { TrafficReport } from '@/lib/types';

type TrafficMapProps = {
  reports: TrafficReport[];
  userCoords?: { lat: number; lng: number } | null;
  draftPin?: { lat: number; lng: number } | null;
  pickMode?: boolean;
  theme: AppTheme;
  onMarkerPress?: (report: TrafficReport) => void;
  onLongPress?: (coords: { lat: number; lng: number }) => void;
  onPickTap?: (coords: { lat: number; lng: number }) => void;
};

export type TrafficMapHandle = {
  centerOn: (coords: { lat: number; lng: number }) => void;
};

/**
 * Native live map of nearby reports. Always frames São Miguel; user location is
 * shown only when on-island. Web has no react-native-maps MapView — list fallback.
 */
export const TrafficMap = forwardRef<TrafficMapHandle, TrafficMapProps>(function TrafficMap(
  {
    reports,
    userCoords,
    draftPin,
    pickMode,
    theme,
    onMarkerPress,
    onLongPress,
    onPickTap,
  },
  ref,
) {
  const mapRef = useRef<React.ElementRef<typeof OsmMapView>>(null);

  useImperativeHandle(
    ref,
    () => ({
      centerOn: (coords) => {
        mapRef.current?.animateToRegion(coordinateToRegion(coords, 0.025), 280);
      },
    }),
    [],
  );
  const islandRegion = useMemo(() => getIslandMapRegion(saoMiguelMapBounds, trafficMapViewportPad), []);
  const userOnIsland = useMemo(
    () => (userCoords ? isWithinIslandBounds(userCoords.lat, userCoords.lng) : false),
    [userCoords],
  );

  const onRegionChangeComplete = useCallback((next: Region) => {
    if (!regionNeedsClamp(next, saoMiguelMapBounds, trafficMapViewportPad)) {
      return;
    }
    const clamped = clampMapRegion(next, saoMiguelMapBounds, trafficMapViewportPad);
    mapRef.current?.animateToRegion(clamped, 180);
  }, []);

  const androidOverlays = useMemo(
    () => ({
      markers: [
        ...reports.map((report) =>
          trafficMarkerOverlay(report, theme, () => onMarkerPress?.(report)),
        ),
        ...(draftPin
          ? [
              {
                id: 'draft-pin',
                latitude: draftPin.lat,
                longitude: draftPin.lng,
                pinColor: theme.secondary,
              },
            ]
          : []),
      ],
      polylines: [],
    }),
    [reports, draftPin, theme, onMarkerPress],
  );

  if (Platform.OS === 'web') {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <OsmMapView
        ref={mapRef}
        style={styles.map}
        initialRegion={islandRegion}
        androidOverlays={androidOverlays}
        minZoomLevel={8}
        maxZoomLevel={18}
        showsUserLocation={userOnIsland}
        centerCoordinate={userOnIsland ? userCoords : null}
        scrollEnabled
        zoomEnabled
        onRegionChangeComplete={onRegionChangeComplete}
        onPress={
          pickMode && onPickTap
            ? (e) => {
                const { latitude, longitude } = e.nativeEvent.coordinate;
                onPickTap(clampCoordinate(latitude, longitude));
              }
            : undefined
        }
        onLongPress={
          onLongPress || onPickTap
            ? (e) => {
                const { latitude, longitude } = e.nativeEvent.coordinate;
                const coords = clampCoordinate(latitude, longitude);
                if (onLongPress) {
                  onLongPress(coords);
                } else {
                  onPickTap?.(coords);
                }
              }
            : undefined
        }
      >
        {Platform.OS === 'ios' && draftPin ? (
          <Marker
            coordinate={{ latitude: draftPin.lat, longitude: draftPin.lng }}
            tracksViewChanges={false}
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={[styles.draftPin, { backgroundColor: theme.secondary, borderColor: theme.onSecondary }]}>
              <MapPin size={22} color={theme.onSecondary} strokeWidth={2.5} />
            </View>
          </Marker>
        ) : null}
        {Platform.OS === 'ios'
          ? reports.map((report) => (
              <TrafficMapMarker
                key={report.id}
                report={report}
                theme={theme}
                onPress={() => onMarkerPress?.(report)}
              />
            ))
          : null}
      </OsmMapView>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { width: '100%', height: '100%' },
  map: { width: '100%', height: '100%' },
  draftPin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    elevation: 6,
  },
});

// Bounds exported for tests / callers that need explicit limits
export { saoMiguelMapBounds };
