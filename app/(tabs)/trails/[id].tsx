import React, { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/Badge';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState, LoadingState } from '@/components/ui/StateView';
import { TrailMap } from '@/features/trails/components/TrailMap';
import { space } from '@/lib/tokens';
import { TrailWeather } from '@/features/trails/components/TrailWeather';
import { useTrail } from '@/features/trails/hooks/useTrailQueries';
import { trailCentroid } from '@/features/trails/types';
import { track } from '@/lib/analytics';
import { useAppTheme } from '@/lib/theme';

export default function TrailDetailScreen() {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const trailId = Number(id);
  const trail = useTrail(trailId, Number.isFinite(trailId));

  useEffect(() => {
    if (trail.data) {
      track('trails', 'view', {
        trail_id: trail.data.id,
        difficulty: trail.data.difficulty || undefined,
      });
    }
  }, [trail.data?.id, trail.data?.difficulty]);

  if (trail.isLoading) {
    return (
      <Screen withStackHeader>
        <LoadingState />
      </Screen>
    );
  }

  if (!trail.data) {
    return (
      <Screen withStackHeader>
        <ErrorState title={t('trailsNotFound')} />
      </Screen>
    );
  }

  const data = trail.data;
  const difficultyLabel = data.difficulty
    ? t(`trailsDifficulty_${data.difficulty}`, { defaultValue: data.difficulty })
    : '—';
  const description =
    i18n.language.startsWith('pt') && data.descriptionPt
      ? data.descriptionPt
      : data.descriptionEn || data.descriptionPt || '';
  const centroid = trailCentroid(data.geojson);
  const mapsUrl =
    data.startLat != null && data.startLng != null
      ? `https://www.google.com/maps?q=${data.startLat},${data.startLng}`
      : centroid
        ? `https://www.google.com/maps?q=${centroid.lat},${centroid.lng}`
        : null;

  const openDownload = (url: string | undefined, kind: 'gpx' | 'kml' | 'leaflet') => {
    if (!url) {
      return;
    }
    track('trails', 'download', { kind, trail_id: data.id });
    void WebBrowser.openBrowserAsync(url);
  };

  return (
    <Screen withStackHeader>
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>{data.name}</Text>

      <View style={styles.badges}>
        <Badge label={t('trailsDifficultyLabel', { difficulty: difficultyLabel })} tone="primary" />
        {data.shape ? (
          <Badge label={t(`trailsShape_${data.shape}`, { defaultValue: data.shape })} tone="neutral" />
        ) : null}
        {data.durationMin != null ? (
          <Badge
            label={t('trailsDuration', {
              hours: Math.floor(data.durationMin / 60),
              minutes: data.durationMin % 60,
            })}
            tone="neutral"
          />
        ) : null}
      </View>

      {data.distanceKm != null ? (
        <Text style={{ color: theme.text, marginBottom: 12 }}>
          {t('trailsDistance', { km: data.distanceKm.toFixed(1) })}
        </Text>
      ) : null}

      {description ? (
        <Text style={{ color: theme.text, lineHeight: 22, marginBottom: 16 }}>{description}</Text>
      ) : null}

      <TrailMap
        trail={data}
        theme={theme}
        onMapOpen={() => track('trails', 'map_open', { trail_id: data.id })}
      />

      <TrailWeather lat={data.startLat} lng={data.startLng} theme={theme} />

      {(data.waypoints?.length ?? 0) > 0 ? (
        <View style={{ marginBottom: 16 }}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('trailsWaypoints')}</Text>
          {data.waypoints!.map((waypoint) => (
            <Text key={`${waypoint.name}-${waypoint.lat}`} style={{ color: theme.muted, marginBottom: 4 }}>
              • {waypoint.name}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.downloads}>
        {data.gpxUrl ? (
          <Button label={t('trailsDownloadGpx')} variant="secondary" fullWidth onPress={() => openDownload(data.gpxUrl, 'gpx')} style={{ marginBottom: space.sm }} />
        ) : null}
        {data.kmlUrl ? (
          <Button label={t('trailsDownloadKml')} variant="secondary" fullWidth onPress={() => openDownload(data.kmlUrl, 'kml')} style={{ marginBottom: space.sm }} />
        ) : null}
        {data.leafletUrl ? (
          <Button label={t('trailsDownloadLeaflet')} variant="secondary" fullWidth onPress={() => openDownload(data.leafletUrl, 'leaflet')} style={{ marginBottom: space.sm }} />
        ) : null}
      </View>

      {mapsUrl ? (
        <Button
          label={t('trailsOpenMap')}
          fullWidth
          onPress={() => {
            track('trails', 'map_open', { trail_id: data.id, external: true });
            void WebBrowser.openBrowserAsync(mapsUrl);
          }}
          style={{ marginBottom: space.sm }}
        />
      ) : null}

      {data.nearestStop ? (
        <Button
          label={t('trailsByBus', {
            stop: data.nearestStop.name,
            km: data.nearestStop.distanceKm.toFixed(1),
          })}
          fullWidth
          onPress={() => {
            track('trails', 'engage', { action: 'get_directions', trail_id: data.id });
            router.push({
              pathname: '/(tabs)/transit/directions',
              params: { destination: data.nearestStop!.name },
            });
          }}
          style={{ marginBottom: space.lg }}
        />
      ) : null}

      {data.attribution ? (
        <Text style={{ color: theme.muted, fontSize: 11, lineHeight: 16 }}>{data.attribution}</Text>
      ) : null}
    </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  badge: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  downloads: { marginBottom: 4 },
});
