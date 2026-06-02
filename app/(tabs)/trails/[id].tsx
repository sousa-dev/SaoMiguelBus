import React, { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';

import { useTrail } from '@/features/trails/hooks/useTrailQueries';
import { trailCentroid } from '@/features/trails/types';
import { track } from '@/lib/analytics';
import { useAppTheme } from '@/lib/theme';

export default function TrailDetailScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
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
  const centroid = trailCentroid(data.geojson);
  const mapsUrl = centroid
    ? `https://www.google.com/maps?q=${centroid.lat},${centroid.lng}`
    : null;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>{data.name}</Text>
      <Text style={{ color: theme.muted, marginBottom: 8 }}>
        {t('trailsDifficultyLabel', { difficulty: difficultyLabel })}
      </Text>
      {data.distanceKm != null ? (
        <Text style={{ color: theme.text, marginBottom: 16 }}>
          {t('trailsDistance', { km: data.distanceKm.toFixed(1) })}
        </Text>
      ) : null}

      {mapsUrl ? (
        <Pressable
          onPress={() => WebBrowser.openBrowserAsync(mapsUrl)}
          style={[styles.btn, { backgroundColor: theme.primary, marginBottom: 16 }]}
        >
          <Text style={styles.btnText}>{t('trailsOpenMap')}</Text>
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
  btn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
});
