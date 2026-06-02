import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTrailWeather } from '@/features/trails/hooks/useTrailWeather';
import { track } from '@/lib/analytics';
import type { AppTheme } from '@/lib/theme';

export function TrailWeather({
  lat,
  lng,
  theme,
}: {
  lat?: number | null;
  lng?: number | null;
  theme: AppTheme;
}) {
  const { t } = useTranslation();
  const weather = useTrailWeather(lat, lng);

  useEffect(() => {
    if (weather.data && lat != null && lng != null) {
      track('trails', 'weather_view', { lat, lng });
    }
  }, [weather.data, lat, lng]);

  if (lat == null || lng == null) {
    return null;
  }

  if (weather.isLoading) {
    return <ActivityIndicator color={theme.primary} style={{ marginBottom: 12 }} />;
  }

  if (weather.isError || !weather.data?.current) {
    return null;
  }

  const current = weather.data.current.temperature_2m;
  const daily = weather.data.daily;

  return (
    <View style={[styles.wrap, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>{t('trailsWeatherTitle')}</Text>
      {current != null ? (
        <Text style={{ color: theme.text, fontSize: 22, fontWeight: '700' }}>
          {t('trailsWeatherNow', { temp: Math.round(current) })}
        </Text>
      ) : null}
      {daily?.time?.length ? (
        <View style={styles.forecast}>
          {daily.time.slice(0, 3).map((day, index) => (
            <Text key={day} style={{ color: theme.muted, fontSize: 12 }}>
              {new Date(day).toLocaleDateString(undefined, { weekday: 'short' })}{' '}
              {daily.temperature_2m_min?.[index] != null && daily.temperature_2m_max?.[index] != null
                ? `${Math.round(daily.temperature_2m_min[index])}–${Math.round(daily.temperature_2m_max[index])}°C`
                : ''}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  title: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  forecast: { marginTop: 8, gap: 4 },
});
