import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { weatherCodeEmoji, weatherCodeLabelKey } from '@/features/weather/weatherCodes';
import type { WeatherHourlySlot } from '@/lib/types';
import { radius, space } from '@/lib/tokens';
import type { AppTheme } from '@/lib/theme';

function hourLabel(time: string): string {
  const part = time.split('T')[1];
  return part ? part.slice(0, 5) : time;
}

function isPastHour(time: string, now: Date): boolean {
  const slot = new Date(time);
  if (Number.isNaN(slot.getTime())) {
    return false;
  }
  return slot.getTime() < now.getTime();
}

export function HourlyForecastList({
  hours,
  theme,
}: {
  hours: WeatherHourlySlot[];
  theme: AppTheme;
}) {
  const { t } = useTranslation();
  const now = new Date();

  if (!hours.length) {
    return (
      <Text style={[styles.empty, { color: theme.muted }]}>{t('weatherHourlyEmpty')}</Text>
    );
  }

  return (
    <View style={styles.list}>
      {hours.map((slot) => {
        const past = isPastHour(slot.time, now);
        return (
          <View
            key={slot.time}
            style={[
              styles.row,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                opacity: past ? 0.55 : 1,
              },
            ]}
          >
            <Text style={[styles.hour, { color: theme.text }]}>{hourLabel(slot.time)}</Text>
            <Text style={styles.emoji}>{weatherCodeEmoji(slot.weatherCode)}</Text>
            <View style={styles.body}>
              <Text style={{ color: theme.text, fontWeight: '600' }}>
                {t(weatherCodeLabelKey(slot.weatherCode))}
              </Text>
              <Text style={{ color: theme.muted, fontSize: 12 }}>
                {[
                  slot.temperature != null ? `${Math.round(slot.temperature)}°C` : null,
                  slot.windSpeed != null
                    ? t('weatherWind', { speed: Math.round(slot.windSpeed) })
                    : null,
                  slot.precipitationProbability != null
                    ? `${Math.round(slot.precipitationProbability)}%`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.sm, paddingHorizontal: space.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: space.md,
  },
  hour: { width: 44, fontSize: 13, fontWeight: '700' },
  emoji: { fontSize: 22, width: 28, textAlign: 'center' },
  body: { flex: 1, gap: 2 },
  empty: { fontSize: 13, textAlign: 'center', padding: space.lg },
});
