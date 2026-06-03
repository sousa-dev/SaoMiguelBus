import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
import type { HomeData } from '@/features/hub/hooks/useHomeData';
import { weatherCodeEmoji, weatherCodeLabelKey } from '@/features/weather/weatherCodes';
import { formatAppDate } from '@/lib/date-format';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

const FORECAST_DAYS = 3;

export function HomeWeatherCard({ data }: { data: HomeData['weather'] }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { parish, isLoading, isLocating } = data;

  const title = t('homeWeatherTitle');
  const temp = parish?.current?.temperature;
  const code = parish?.current?.weatherCode;
  const forecast = parish?.daily?.slice(0, FORECAST_DAYS) ?? [];

  let body: React.ReactNode;
  if (parish) {
    body = (
      <>
        <View style={styles.row}>
          <View style={styles.left}>
            <Text style={[typography.overline, { color: theme.onSurfaceMuted }]}>{title}</Text>
            <Text style={[typography.headline, { color: theme.onSurface, marginTop: space.xs }]} numberOfLines={1}>
              {parish.name}
            </Text>
            <Text style={[typography.caption, { color: theme.onSurfaceMuted, marginTop: space.xs }]}>
              {t(weatherCodeLabelKey(code))}
            </Text>
          </View>
          <View style={styles.right}>
            <Text style={styles.emoji}>{weatherCodeEmoji(code)}</Text>
            <Text style={[typography.title, { color: theme.onSurface }]}>
              {typeof temp === 'number' ? `${Math.round(temp)}°` : '—'}
            </Text>
          </View>
        </View>
        {forecast.length > 0 ? (
          <View style={[styles.forecastRow, { borderTopColor: theme.border }]}>
            {forecast.map((day) => (
              <View key={day.date} style={styles.forecastDay}>
                <Text style={[typography.caption, { color: theme.onSurfaceMuted }]} numberOfLines={1}>
                  {formatAppDate(day.date)}
                </Text>
                <Text style={styles.forecastEmoji}>{weatherCodeEmoji(day.weatherCode)}</Text>
                {day.tempMin != null && day.tempMax != null ? (
                  <Text style={[typography.caption, { color: theme.onSurface }]}>
                    {Math.round(day.tempMin)}° / {Math.round(day.tempMax)}°
                  </Text>
                ) : (
                  <Text style={[typography.caption, { color: theme.onSurfaceMuted }]}>—</Text>
                )}
              </View>
            ))}
          </View>
        ) : null}
      </>
    );
  } else {
    body = (
      <View>
        <Text style={[typography.overline, { color: theme.onSurfaceMuted }]}>{title}</Text>
        <Text style={[typography.body, { color: theme.onSurfaceMuted, marginTop: space.xs }]}>
          {isLoading || isLocating ? t('homeWeatherLocating') : t('homeWeatherUnavailable')}
        </Text>
      </View>
    );
  }

  return (
    <Card
      onPress={() => router.push('/weather')}
      accessibilityLabel={title}
      style={styles.card}
    >
      {body}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: space.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  left: { flex: 1, paddingRight: space.md },
  right: { alignItems: 'center' },
  emoji: { fontSize: 30, marginBottom: space.xs },
  forecastRow: {
    flexDirection: 'row',
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: space.sm,
  },
  forecastDay: { flex: 1, alignItems: 'center' },
  forecastEmoji: { fontSize: 22, marginVertical: space.xs },
});
