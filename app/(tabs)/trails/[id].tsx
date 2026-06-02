import React, { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';

import { TrailMap } from '@/features/trails/components/TrailMap';
import { TrailWeather } from '@/features/trails/components/TrailWeather';
import { useTrail } from '@/features/trails/hooks/useTrailQueries';
import { trailCentroid } from '@/features/trails/types';
import { track } from '@/lib/analytics';
import { useAppTheme } from '@/lib/theme';

function Badge({ label, theme }: { label: string; theme: ReturnType<typeof useAppTheme> }) {
  return (
    <View style={[styles.badge, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

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
    return <ActivityIndicator color={theme.primary} style={{ marginTop: 24 }} />;
  }

  if (!trail.data) {
    return <Text style={{ color: theme.muted, padding: 16 }}>{t('trailsNotFound')}</Text>;
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
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>{data.name}</Text>

      <View style={styles.badges}>
        <Badge label={t('trailsDifficultyLabel', { difficulty: difficultyLabel })} theme={theme} />
        {data.shape ? (
          <Badge label={t(`trailsShape_${data.shape}`, { defaultValue: data.shape })} theme={theme} />
        ) : null}
        {data.durationMin != null ? (
          <Badge label={t('trailsDuration', { hours: Math.floor(data.durationMin / 60), minutes: data.durationMin % 60 })} theme={theme} />
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
          <Pressable
            onPress={() => openDownload(data.gpxUrl, 'gpx')}
            style={[styles.btn, { backgroundColor: theme.secondary, marginBottom: 10 }]}
          >
            <Text style={styles.btnText}>{t('trailsDownloadGpx')}</Text>
          </Pressable>
        ) : null}
        {data.kmlUrl ? (
          <Pressable
            onPress={() => openDownload(data.kmlUrl, 'kml')}
            style={[styles.btn, { backgroundColor: theme.secondary, marginBottom: 10 }]}
          >
            <Text style={styles.btnText}>{t('trailsDownloadKml')}</Text>
          </Pressable>
        ) : null}
        {data.leafletUrl ? (
          <Pressable
            onPress={() => openDownload(data.leafletUrl, 'leaflet')}
            style={[styles.btn, { backgroundColor: theme.secondary, marginBottom: 10 }]}
          >
            <Text style={styles.btnText}>{t('trailsDownloadLeaflet')}</Text>
          </Pressable>
        ) : null}
      </View>

      {mapsUrl ? (
        <Pressable
          onPress={() => {
            track('trails', 'map_open', { trail_id: data.id, external: true });
            void WebBrowser.openBrowserAsync(mapsUrl);
          }}
          style={[styles.btn, { backgroundColor: theme.primary, marginBottom: 10 }]}
        >
          <Text style={styles.btnText}>{t('trailsOpenMap')}</Text>
        </Pressable>
      ) : null}

      {data.nearestStop ? (
        <Pressable
          onPress={() => {
            track('trails', 'engage', { action: 'get_directions', trail_id: data.id });
            router.push({
              pathname: '/(tabs)/transit/directions',
              params: { destination: data.nearestStop!.name },
            });
          }}
          style={[styles.btn, { backgroundColor: theme.primary, marginBottom: 16 }]}
        >
          <Text style={styles.btnText}>
            {t('trailsByBus', {
              stop: data.nearestStop.name,
              km: data.nearestStop.distanceKm.toFixed(1),
            })}
          </Text>
        </Pressable>
      ) : null}

      {data.attribution ? (
        <Text style={{ color: theme.muted, fontSize: 11, lineHeight: 16 }}>{data.attribution}</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  badge: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  downloads: { marginBottom: 4 },
  btn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
});
