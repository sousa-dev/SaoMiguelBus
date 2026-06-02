import React, { useMemo } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';

import { MapAttribution } from '@/components/MapAttribution';
import { OsmMapLayer } from '@/components/OsmMapLayer';
import { geojsonToMapCoordinates, trailCentroid, type TrailDetail } from '@/features/trails/types';
import type { AppTheme } from '@/lib/theme';

type TrailMapProps = {
  trail: Pick<
    TrailDetail,
    'geojson' | 'mapImageUrl' | 'startLat' | 'startLng' | 'waypoints' | 'name'
  >;
  theme: AppTheme;
  onMapOpen?: () => void;
};

function mapRegion(
  coordinates: { latitude: number; longitude: number }[],
  startLat?: number | null,
  startLng?: number | null,
) {
  const points = [...coordinates];
  if (startLat != null && startLng != null) {
    points.push({ latitude: startLat, longitude: startLng });
  }
  if (!points.length) {
    return {
      latitude: 37.78,
      longitude: -25.5,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
  }
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const pad = 0.01;
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(maxLat - minLat + pad, 0.02),
    longitudeDelta: Math.max(maxLng - minLng + pad, 0.02),
  };
}

export function TrailMap({ trail, theme, onMapOpen }: TrailMapProps) {
  const { t } = useTranslation();
  const coordinates = useMemo(() => geojsonToMapCoordinates(trail.geojson), [trail.geojson]);
  const region = useMemo(
    () => mapRegion(coordinates, trail.startLat, trail.startLng),
    [coordinates, trail.startLat, trail.startLng],
  );
  const centroid = trailCentroid(trail.geojson);
  const externalUrl =
    trail.startLat != null && trail.startLng != null
      ? `https://www.google.com/maps?q=${trail.startLat},${trail.startLng}`
      : centroid
        ? `https://www.google.com/maps?q=${centroid.lat},${centroid.lng}`
        : null;

  if (Platform.OS === 'web') {
    if (!trail.mapImageUrl) {
      return null;
    }
    return (
      <View style={styles.wrap}>
        <Pressable
          onPress={() => {
            onMapOpen?.();
            if (externalUrl) {
              void WebBrowser.openBrowserAsync(externalUrl);
            }
          }}
        >
          <Image
            source={{ uri: trail.mapImageUrl }}
            style={[styles.webImage, { backgroundColor: theme.surfaceVariant }]}
            resizeMode="contain"
          />
        </Pressable>
        {externalUrl ? (
          <Text style={{ color: theme.primary, marginTop: 8, fontSize: 13 }}>
            {t('trailsOpenMap')}
          </Text>
        ) : null}
      </View>
    );
  }

  if (!coordinates.length) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        mapType="none"
        initialRegion={region}
        scrollEnabled
        zoomEnabled
      >
        <OsmMapLayer isDark={theme.isDark} />
        <Polyline coordinates={coordinates} strokeColor={theme.primary} strokeWidth={4} />
        {trail.startLat != null && trail.startLng != null ? (
          <Marker
            coordinate={{ latitude: trail.startLat, longitude: trail.startLng }}
            title={trail.name}
            pinColor={theme.primary}
          />
        ) : null}
        {(trail.waypoints ?? []).map((waypoint) => (
          <Marker
            key={`${waypoint.name}-${waypoint.lat}-${waypoint.lng}`}
            coordinate={{ latitude: waypoint.lat, longitude: waypoint.lng }}
            title={waypoint.name}
          />
        ))}
      </MapView>
      <MapAttribution isDark={theme.isDark} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  map: { width: '100%', height: 220, borderRadius: 12 },
  webImage: { width: '100%', height: 220, borderRadius: 12 },
});
