import React, { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Marker, Polyline } from 'react-native-maps';
import * as WebBrowser from 'expo-web-browser';
import { Map } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { OsmMapView } from '@/components/OsmMapView';
import { TrailThumb } from '@/features/trails/components/TrailThumb';
import { geojsonToMapCoordinates, trailCentroid, type TrailDetail } from '@/features/trails/types';
import { iconSize, radius, space } from '@/lib/tokens';
import type { AppTheme } from '@/lib/theme';

const MAP_HEIGHT = 240;

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

function externalMapsUrl(
  geojson: TrailDetail['geojson'],
  startLat?: number | null,
  startLng?: number | null,
): string | null {
  if (startLat != null && startLng != null) {
    return `https://www.google.com/maps?q=${startLat},${startLng}`;
  }
  const centroid = trailCentroid(geojson);
  return centroid ? `https://www.google.com/maps?q=${centroid.lat},${centroid.lng}` : null;
}

export function TrailMap({ trail, theme, onMapOpen }: TrailMapProps) {
  const { t } = useTranslation();
  const coordinates = useMemo(() => geojsonToMapCoordinates(trail.geojson), [trail.geojson]);
  const region = useMemo(
    () => mapRegion(coordinates, trail.startLat, trail.startLng),
    [coordinates, trail.startLat, trail.startLng],
  );
  const externalUrl = externalMapsUrl(trail.geojson, trail.startLat, trail.startLng);

  const openExternal = () => {
    onMapOpen?.();
    if (externalUrl) {
      void WebBrowser.openBrowserAsync(externalUrl);
    }
  };

  if (trail.mapImageUrl) {
    return (
      <View style={styles.wrap}>
        <Pressable onPress={openExternal} disabled={!externalUrl}>
          <TrailThumb
            uri={trail.mapImageUrl}
            theme={theme}
            iconSize={iconSize.xl}
            resizeMode="contain"
            style={styles.media}
          />
        </Pressable>
        {externalUrl ? (
          <Text style={[styles.openLink, { color: theme.primary }]}>{t('trailsOpenMap')}</Text>
        ) : null}
      </View>
    );
  }

  if (Platform.OS === 'web') {
    if (!externalUrl) {
      return null;
    }
    return (
      <View style={styles.wrap}>
        <Pressable
          onPress={openExternal}
          style={[
            styles.media,
            styles.webPlaceholder,
            { backgroundColor: theme.surfaceVariant, borderColor: theme.border },
          ]}
        >
          <Map size={iconSize.xl} color={theme.muted} />
          <Text style={[styles.webPlaceholderText, { color: theme.text }]}>{t('trailsOpenMap')}</Text>
        </Pressable>
      </View>
    );
  }

  if (!coordinates.length) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <Pressable onPress={openExternal} disabled={!externalUrl}>
        <OsmMapView
          style={styles.media}
          isDark={theme.isDark}
          showLoadingIndicator={false}
          initialRegion={region}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          pointerEvents="none"
        >
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
        </OsmMapView>
      </Pressable>
      {externalUrl ? (
        <Text style={[styles.openLink, { color: theme.primary }]}>{t('trailsOpenMap')}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.lg },
  media: {
    width: '100%',
    height: MAP_HEIGHT,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  openLink: { marginTop: space.sm, fontSize: 13 },
  webPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    gap: space.sm,
  },
  webPlaceholderText: { fontSize: 14, fontWeight: '600' },
});
