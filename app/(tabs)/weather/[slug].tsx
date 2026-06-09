import { Pin, RefreshCw } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { ErrorState } from '@/components/ui/StateView';
import { DayHourlySheet } from '@/features/weather/components/DayHourlySheet';
import { HourlyForecastStrip } from '@/features/weather/components/HourlyForecastStrip';
import {
  useWeatherParish,
  useWeatherParishHourly,
} from '@/features/weather/hooks/useWeatherQueries';
import { weatherCodeEmoji, weatherCodeLabelKey } from '@/features/weather/weatherCodes';
import { staticIslandConfig } from '@/config/island';
import { useBootstrap } from '@/features/transit/hooks/useTransitQueries';
import { useFabActions } from '@/lib/fab-store';
import { useWeatherStore } from '@/features/weather/weather-store';
import { track } from '@/lib/analytics';
import { formatAppDate } from '@/lib/date-format';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

function localTodayIso(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function WeatherDetailScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const parishSlug = typeof slug === 'string' ? slug : '';
  const { data: bootstrap } = useBootstrap();
  const modules = bootstrap?.island?.enabledModules ?? staticIslandConfig.enabledModules;
  const showWeather = modules.includes('weather');
  const query = useWeatherParish(parishSlug, showWeather && Boolean(parishSlug));
  const togglePin = useWeatherStore((s) => s.togglePin);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const todayDate = useMemo(() => {
    const fromCurrent = query.data?.current?.time?.split('T')[0];
    const fromDaily = query.data?.daily?.[0]?.date;
    return fromCurrent ?? fromDaily ?? localTodayIso();
  }, [query.data]);

  const todayHourly = useWeatherParishHourly(
    parishSlug,
    todayDate,
    showWeather && Boolean(parishSlug) && Boolean(query.data),
  );

  useEffect(() => {
    if (todayHourly.data) {
      track('weather', 'hourly_view', { slug: parishSlug, date: todayDate });
    }
  }, [todayHourly.data, parishSlug, todayDate]);

  useFabActions(
    useMemo(
      () =>
        parishSlug
          ? [
              {
                key: 'pin-parish',
                labelKey: 'fabPinParish',
                icon: Pin,
                onPress: () => togglePin(parishSlug),
              },
              {
                key: 'refresh',
                labelKey: 'fabRefresh',
                icon: RefreshCw,
                onPress: () => {
                  void query.refetch();
                  void todayHourly.refetch();
                },
              },
            ]
          : [],
      [parishSlug, togglePin, query.refetch, todayHourly.refetch],
    ),
  );

  useFocusEffect(
    useCallback(() => {
      if (!showWeather || !parishSlug) {
        return;
      }
      void query.refetch();
      track('weather', 'view', { screen: 'detail', slug: parishSlug });
    }, [showWeather, parishSlug, query.refetch]),
  );

  const handleDayPress = useCallback(
    (date: string) => {
      if (date === todayDate) {
        return;
      }
      setSelectedDate(date);
      setSheetOpen(true);
      track('weather', 'hourly_view', { slug: parishSlug, date });
    },
    [todayDate, parishSlug],
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

        <Text style={[styles.forecastTitle, { color: theme.text }]}>{t('weatherHourlyTodayTitle')}</Text>
        {todayHourly.isLoading && !todayHourly.data ? (
          <ActivityIndicator color={theme.primary} style={{ marginBottom: space.lg }} />
        ) : null}
        {todayHourly.isError ? (
          <Text style={[styles.hourlyError, { color: theme.muted }]}>{t('weatherHourlyLoadError')}</Text>
        ) : null}
        {todayHourly.data ? (
          <HourlyForecastStrip hours={todayHourly.data.hours} theme={theme} />
        ) : null}
        <Text style={[styles.pastNote, { color: theme.muted }]}>{t('weatherHourlyPastLabel')}</Text>

        <Text style={[styles.forecastTitle, { color: theme.text, marginTop: space.lg }]}>
          {t('weatherForecastTitle')}
        </Text>
        {parish.daily.map((day) => {
          const isToday = day.date === todayDate;
          const rowContent = (
            <>
              <Text style={[styles.dayLabel, { color: theme.text }]}>{formatAppDate(day.date)}</Text>
              <Text style={styles.dayEmoji}>{weatherCodeEmoji(day.weatherCode)}</Text>
              <Text style={{ color: theme.muted, flex: 1 }}>{t(weatherCodeLabelKey(day.weatherCode))}</Text>
              {day.tempMin != null && day.tempMax != null ? (
                <Text style={{ color: theme.text, fontWeight: '600' }}>
                  {t('weatherHiLo', { min: Math.round(day.tempMin), max: Math.round(day.tempMax) })}
                </Text>
              ) : null}
            </>
          );
          if (isToday) {
            return (
              <View
                key={day.date}
                style={[styles.dayRow, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                {rowContent}
              </View>
            );
          }
          return (
            <Pressable
              key={day.date}
              accessibilityRole="button"
              onPress={() => handleDayPress(day.date)}
              style={({ pressed }) => [
                styles.dayRow,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  opacity: pressed ? 0.92 : 1,
                },
              ]}
            >
              {rowContent}
            </Pressable>
          );
        })}

        <Text style={[styles.attribution, { color: theme.muted }]}>{t('weatherAttribution')}</Text>
      </ScrollView>

      {selectedDate ? (
        <DayHourlySheet
          visible={sheetOpen}
          onClose={() => setSheetOpen(false)}
          slug={parishSlug}
          date={selectedDate}
        />
      ) : null}
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
  hourlyError: { fontSize: 13, marginBottom: space.md },
  pastNote: { fontSize: 10, marginTop: space.xs, marginBottom: space.md },
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
