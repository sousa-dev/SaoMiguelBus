import React, { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, UrlTile } from 'react-native-maps';

import type { AppTheme } from '@/lib/theme';
import type { TrafficReport } from '@/lib/types';

type TrafficMapProps = {
  reports: TrafficReport[];
  center: { lat: number; lng: number };
  userCoords?: { lat: number; lng: number } | null;
  theme: AppTheme;
  onMarkerPress?: (report: TrafficReport) => void;
};

/**
 * Native live map of nearby reports. Web has no react-native-maps MapView, so
 * the screen renders a list fallback instead (mirrors TrailMap).
 */
export function TrafficMap({ reports, center, userCoords, theme, onMarkerPress }: TrafficMapProps) {
  const region = useMemo(
    () => ({
      latitude: userCoords?.lat ?? center.lat,
      longitude: userCoords?.lng ?? center.lng,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    }),
    [center.lat, center.lng, userCoords?.lat, userCoords?.lng],
  );

  if (Platform.OS === 'web') {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={region}
        showsUserLocation={!!userCoords}
        scrollEnabled
        zoomEnabled
      >
        {Platform.OS === 'android' ? (
          <UrlTile
            urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maximumZ={19}
            flipY={false}
          />
        ) : null}
        {reports.map((report) => (
          <Marker
            key={report.id}
            coordinate={{ latitude: report.latitude, longitude: report.longitude }}
            title={`${report.category.icon} ${report.category.name}`}
            description={report.description || report.road || undefined}
            pinColor={report.status === 'scheduled' ? theme.accent : theme.primary}
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
});
