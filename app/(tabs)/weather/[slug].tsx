import { useCallback } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { ErrorState } from '@/components/ui/StateView';
import { useWeatherParish } from '@/features/weather/hooks/useWeatherQueries';
import { weatherCodeEmoji, weatherCodeLabelKey } from '@/features/weather/weatherCodes';
import { staticIslandConfig } from '@/config/island';
import { useBootstrap } from '@/features/transit/hooks/useTransitQueries';
import { track } from '@/lib/analytics';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

export default function WeatherDetailScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const parishSlug = typeof slug === 'string' ? slug : '';
  const { data: bootstrap } = useBootstrap();
  const modules = bootstrap?.island?.enabledModules ?? staticIslandConfig.enabledModules;
  const showWeather = modules.includes('weather');
  const query = useWeatherParish(parishSlug, showWeather && Boolean(parishSlug));

  useFocusEffect(
    useCallback(() => {
      if (!showWeather || !parishSlug) {
        return;
      }
      void query.refetch();
      track('weather', 'view', { screen: 'detail', slug: parishSlug });
    }, [showWeather, parishSlug, query.refetch]),
  );

  if (!showWeather) {
    return null;
  }

  if (query.isLoading && !query.data) {
    return (
      <Screen>
        <ActivityIndicator color={theme.primary} />
      </Screen>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Screen>
        <ErrorState
          title={t('weatherLoadError')}
          actionLabel={t('commonRetry')}
          onAction={() => void query.refetch()}
        />
      </Screen>
    );
  }

  const parish = query.data;
  const current = parish.current;
  const code = current?.weatherCode;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>{parish.name}</Text>
        <Text style={[styles.concelho, { color: theme.muted }]}>{parish.concelho}</Text>

        <View style={[styles.currentCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={styles.emoji}>{weatherCodeEmoji(code)}</Text>
          {current?.temperature != null ? (
            <Text style={[styles.temp, { color: theme.text }]}>
              {t('weatherCurrentTemp', { temp: Math.round(current.temperature) })}
            </Text>
          ) : null}
          <Text style={{ color: theme.muted }}>{t(weatherCodeLabelKey(code))}</Text>
          {current?.windSpeed != null ? (
            <Text style={[styles.meta, { color: theme.muted }]}>
              {t('weatherWind', { speed: Math.round(current.windSpeed) })}
            </Text>
          ) : null}
          {current?.humidity != null ? (
            <Text style={[styles.meta, { color: theme.muted }]}>
              {t('weatherHumidity', { value: Math.round(current.humidity) })}
            </Text>
          ) : null}
        </View>

        <Text style={[styles.forecastTitle, { color: theme.text }]}>{t('weatherForecastTitle')}</Text>
        {parish.daily.map((day) => (
          <View
            key={day.date}
            style={[styles.dayRow, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Text style={[styles.dayLabel, { color: theme.text }]}>
              {new Date(day.date).toLocaleDateString(undefined, {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}
            </Text>
            <Text style={styles.dayEmoji}>{weatherCodeEmoji(day.weatherCode)}</Text>
            <Text style={{ color: theme.muted, flex: 1 }}>{t(weatherCodeLabelKey(day.weatherCode))}</Text>
            {day.tempMin != null && day.tempMax != null ? (
              <Text style={{ color: theme.text, fontWeight: '600' }}>
                {t('weatherHiLo', { min: Math.round(day.tempMin), max: Math.round(day.tempMax) })}
              </Text>
            ) : null}
          </View>
        ))}

        <Text style={[styles.attribution, { color: theme.muted }]}>{t('weatherAttribution')}</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: space.xl },
  title: { ...typography.headline, marginBottom: space.xs },
  concelho: { marginBottom: space.lg },
  currentCard: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.lg,
    alignItems: 'center',
    marginBottom: space.lg,
  },
  emoji: { fontSize: 48, marginBottom: space.sm },
  temp: { fontSize: 32, fontWeight: '700', marginBottom: space.xs },
  meta: { fontSize: 13, marginTop: 4 },
  forecastTitle: { ...typography.body, fontWeight: '700', marginBottom: space.sm },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: space.md,
    marginBottom: space.sm,
  },
  dayLabel: { width: 88, fontSize: 13, fontWeight: '600' },
  dayEmoji: { fontSize: 22, width: 28, textAlign: 'center' },
  attribution: { fontSize: 10, textAlign: 'center', marginTop: space.lg },
});
