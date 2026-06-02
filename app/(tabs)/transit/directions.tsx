import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DirectionsResults } from '@/features/transit/components/DirectionsResults';
import { useDirections } from '@/features/transit/hooks/useTransitQueries';
import { useAppTheme } from '@/lib/theme';

export default function DirectionsScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    origin?: string;
    destination?: string;
    day?: string;
    start?: string;
  }>();

  const origin = params.origin ?? '';
  const destination = params.destination ?? '';
  const day = params.day ?? 'weekday';
  const start = params.start ?? '08h00';

  const directions = useDirections({
    origin,
    destination,
    day,
    start,
    enabled: Boolean(origin && destination),
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>
          {origin} → {destination}
        </Text>
        {directions.isLoading ? <ActivityIndicator color={theme.primary} /> : null}
        {directions.isError ? (
          <Text style={{ color: theme.muted, marginTop: 12 }}>{t('noRoutesSubtitle')}</Text>
        ) : null}
        {directions.data ? (
          <DirectionsResults data={directions.data} origin={origin} destination={destination} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
});
