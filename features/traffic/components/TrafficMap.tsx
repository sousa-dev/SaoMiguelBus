import React, { useCallback, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, UrlTile, type Region } from 'react-native-maps';

import { TrafficMapMarker } from '@/features/traffic/components/TrafficMapMarker';
import {
  clampCoordinate,
  clampMapRegion,
  getIslandMapRegion,
  isWithinIslandBounds,
  regionNeedsClamp,
  saoMiguelMapBounds,
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

/**
 * Native live map of nearby reports. Always frames São Miguel; user location is
 * shown only when on-island. Web has no react-native-maps MapView — list fallback.
 */
export function TrafficMap({
  reports,
  userCoords,
  draftPin,
  pickMode,
  theme,
  onMarkerPress,
  onLongPress,
  onPickTap,
}: TrafficMapProps) {
  const mapRef = useRef<MapView>(null);
  const islandRegion = useMemo(() => getIslandMapRegion(), []);
  const userOnIsland = useMemo(
    () => (userCoords ? isWithinIslandBounds(userCoords.lat, userCoords.lng) : false),
    [userCoords],
  );

  const onRegionChangeComplete = useCallback((next: Region) => {
    if (!regionNeedsClamp(next)) {
      return;
    }
    const clamped = clampMapRegion(next);
    mapRef.current?.animateToRegion(clamped, 180);
  }, []);

  if (Platform.OS === 'web') {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={islandRegion}
        minZoomLevel={9}
        maxZoomLevel={18}
        showsUserLocation={userOnIsland}
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
        {Platform.OS === 'android' ? (
          <UrlTile
            urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maximumZ={19}
            flipY={false}
          />
        ) : null}
        {draftPin ? (
          <Marker
            coordinate={{ latitude: draftPin.lat, longitude: draftPin.lng }}
            tracksViewChanges={false}
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={[styles.draftPin, { backgroundColor: theme.secondary }]}>
              <Text style={styles.draftPinIcon}>📍</Text>
            </View>
          </Marker>
        ) : null}
        {reports.map((report) => (
          <TrafficMapMarker
            key={report.id}
            report={report}
            theme={theme}
            onPress={() => onMarkerPress?.(report)}
          />
        ))}
      </MapView>
    </View>
  );
}

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
    borderColor: '#fff',
    elevation: 6,
  },
  draftPinIcon: { fontSize: 22 },
});

// Bounds exported for tests / callers that need explicit limits
export { saoMiguelMapBounds };
