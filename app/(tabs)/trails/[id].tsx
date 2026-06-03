import React, { useEffect } from 'react';
import { MapPin } from 'lucide-react-native';
import { Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/Badge';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState, LoadingState } from '@/components/ui/StateView';
import { TrailMap } from '@/features/trails/components/TrailMap';
import { space, typography } from '@/lib/tokens';
import { TrailWeather } from '@/features/trails/components/TrailWeather';
import { useTrail } from '@/features/trails/hooks/useTrailQueries';
import { track } from '@/lib/analytics';
import { useAppTheme } from '@/lib/theme';

export default function TrailDetailScreen() {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
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
  const destination =
    data.startLat != null && data.startLng != null
      ? { lat: data.startLat, lng: data.startLng }
      : null;
  const directionsUrl = destination
    ? Platform.select({
        ios: `http://maps.apple.com/?daddr=${destination.lat},${destination.lng}&q=${encodeURIComponent(
          data.name,
        )}`,
        default: `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`,
      })
    : null;

  const openDirections = () => {
    if (!directionsUrl) {
      return;
    }
    track('trails', 'engage', { action: 'get_directions', trail_id: data.id });
    void Linking.openURL(directionsUrl);
  };

  const openDownload = (url: string | undefined, kind: 'gpx' | 'kml' | 'leaflet') => {
    if (!url) {
      return;
    }
    track('trails', 'download', { kind, trail_id: data.id });
    void WebBrowser.openBrowserAsync(url);
  };

  const hasDownloads = Boolean(data.gpxUrl || data.kmlUrl || data.leafletUrl);
  const hasWaypoints = (data.waypoints?.length ?? 0) > 0;

  return (
    <Screen withStackHeader>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.content}
      >
        <Card style={styles.section}>
          <Text style={[typography.title, { color: theme.text }]}>{data.name}</Text>
          <View style={styles.badges}>
            {data.difficulty ? (
              <Badge label={t('trailsDifficultyLabel', { difficulty: difficultyLabel })} tone="primary" />
            ) : null}
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
            <Text style={[typography.body, { color: theme.text }]}>
              {t('trailsDistance', { km: data.distanceKm.toFixed(1) })}
            </Text>
          ) : null}
          {description ? (
            <Text style={[typography.body, styles.description, { color: theme.text }]}>{description}</Text>
          ) : null}
        </Card>

        <Card style={[styles.section, styles.mapCard]}>
          <TrailMap
            trail={data}
            theme={theme}
            onMapOpen={() => track('trails', 'map_open', { trail_id: data.id })}
          />
        </Card>

        <TrailWeather lat={data.startLat} lng={data.startLng} theme={theme} />

        {hasWaypoints ? (
          <Card style={styles.section}>
            <Text style={[typography.headline, styles.sectionTitle, { color: theme.text }]}>
              {t('trailsWaypoints')}
            </Text>
            {data.waypoints!.map((waypoint) => (
              <View key={`${waypoint.name}-${waypoint.lat}`} style={styles.waypointRow}>
                <MapPin size={16} color={theme.primary} />
                <Text style={[typography.body, { color: theme.text, flex: 1 }]}>{waypoint.name}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        {hasDownloads ? (
          <Card style={styles.section}>
            <Text style={[typography.headline, styles.sectionTitle, { color: theme.text }]}>
              {t('trailsDownloadsTitle')}
            </Text>
            {data.gpxUrl ? (
              <Button
                label={t('trailsDownloadGpx')}
                variant="secondary"
                fullWidth
                onPress={() => openDownload(data.gpxUrl, 'gpx')}
                style={styles.actionBtn}
              />
            ) : null}
            {data.kmlUrl ? (
              <Button
                label={t('trailsDownloadKml')}
                variant="secondary"
                fullWidth
                onPress={() => openDownload(data.kmlUrl, 'kml')}
                style={styles.actionBtn}
              />
            ) : null}
            {data.leafletUrl ? (
              <Button
                label={t('trailsDownloadLeaflet')}
                variant="secondary"
                fullWidth
                onPress={() => openDownload(data.leafletUrl, 'leaflet')}
                style={styles.actionBtn}
              />
            ) : null}
          </Card>
        ) : null}

        {directionsUrl ? (
          <Card style={styles.section}>
            <Button label={t('trailsGetDirections')} fullWidth onPress={openDirections} />
          </Card>
        ) : null}

        {data.attribution ? (
          <Text style={[styles.attribution, { color: theme.muted }]}>
            {t(
              data.attribution.toLowerCase().includes('visitazores')
                ? 'trailsAttribution'
                : 'trailsAttributionOpenData',
            )}
          </Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: space.lg, paddingBottom: space['3xl'], gap: space.md },
  section: { marginBottom: 0 },
  mapCard: { padding: 0, overflow: 'hidden' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm, marginBottom: space.sm },
  description: { lineHeight: 22, marginTop: space.sm },
  sectionTitle: { marginBottom: space.sm },
  waypointRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm },
  actionBtn: { marginBottom: space.sm },
  attribution: { fontSize: 11, lineHeight: 16 },
});
