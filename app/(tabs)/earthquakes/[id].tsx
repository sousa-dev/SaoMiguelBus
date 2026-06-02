import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';

import { FeltReportSheet } from '@/features/earthquakes/components/FeltReportSheet';
import { useSeismicEvent } from '@/features/earthquakes/hooks/useEarthquakeQueries';
import { track } from '@/lib/analytics';
import { useAppTheme } from '@/lib/theme';

export default function EarthquakeDetailScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = Number(id);
  const event = useSeismicEvent(eventId, Number.isFinite(eventId));
  const [feltOpen, setFeltOpen] = useState(false);

  useEffect(() => {
    if (event.data) {
      track('seismic', 'open', { event_id: event.data.id, magnitude: event.data.magnitude });
    }
  }, [event.data?.id]);

  if (event.isLoading) {
    return <ActivityIndicator color={theme.primary} style={{ marginTop: 24 }} />;
  }

  if (!event.data) {
    return <Text style={{ color: theme.muted, padding: 16 }}>{t('seismicNotFound')}</Text>;
  }

  const data = event.data;
  const mapsUrl = `https://www.google.com/maps?q=${data.latitude},${data.longitude}`;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.mag, { color: theme.primary }]}>M{data.magnitude.toFixed(1)}</Text>
      <Text style={[styles.region, { color: theme.text }]}>{data.region || '—'}</Text>
      <Text style={{ color: theme.muted, marginBottom: 12 }}>
        {new Date(data.occurredAt).toLocaleString()}
      </Text>
      <Text style={{ color: theme.text, marginBottom: 8 }}>
        {t('seismicDepth', { depth: data.depthKm ?? '—' })}
      </Text>
      <Text style={{ color: theme.text, marginBottom: 16 }}>
        {t('seismicCoords', { lat: data.latitude.toFixed(2), lng: data.longitude.toFixed(2) })}
      </Text>
      {data.feltCount ? (
        <Text style={{ color: theme.muted, marginBottom: 16 }}>
          {t('seismicFeltCount', { count: data.feltCount })}
        </Text>
      ) : null}

      <Pressable
        onPress={() => WebBrowser.openBrowserAsync(mapsUrl)}
        style={[styles.btn, { backgroundColor: theme.secondary, marginBottom: 10 }]}
      >
        <Text style={styles.btnText}>{t('seismicOpenMap')}</Text>
      </Pressable>

      <Pressable
        onPress={() => setFeltOpen(true)}
        style={[styles.btn, { backgroundColor: theme.primary }]}
      >
        <Text style={styles.btnText}>{t('seismicFeltButton')}</Text>
      </Pressable>

      <FeltReportSheet
        visible={feltOpen}
        eventId={data.id}
        theme={theme}
        onClose={() => setFeltOpen(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  mag: { fontSize: 36, fontWeight: '800' },
  region: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  btn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
});
