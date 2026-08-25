import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { weatherCodeEmoji } from '@/features/weather/weatherCodes';
import { withAlpha } from '@/lib/color-utils';
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

function isCurrentHour(time: string, now: Date): boolean {
  const slot = new Date(time);
  if (Number.isNaN(slot.getTime())) {
    return false;
  }
  return (
    slot.getFullYear() === now.getFullYear() &&
    slot.getMonth() === now.getMonth() &&
    slot.getDate() === now.getDate() &&
    slot.getHours() === now.getHours()
  );
}

export function HourlyForecastStrip({
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
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {hours.map((slot) => {
        const past = isPastHour(slot.time, now);
        const current = isCurrentHour(slot.time, now);
        return (
          <View
            key={slot.time}
            style={[
              styles.chip,
              {
                backgroundColor: current ? withAlpha(theme.primary, 0.12) : theme.card,
                borderColor: current ? theme.primary : theme.border,
                opacity: past && !current ? 0.5 : 1,
              },
            ]}
          >
            <Text style={[styles.hour, { color: theme.muted }]}>{hourLabel(slot.time)}</Text>
            <Text style={styles.emoji}>{weatherCodeEmoji(slot.weatherCode)}</Text>
            {slot.temperature != null ? (
              <Text style={[styles.temp, { color: theme.text }]}>
                {Math.round(slot.temperature)}°
              </Text>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: space.sm, paddingVertical: space.xs },
  chip: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
    minWidth: 56,
  },
  hour: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  emoji: { fontSize: 20, marginBottom: 2 },
  temp: { fontSize: 13, fontWeight: '700' },
  empty: { fontSize: 13, textAlign: 'center', paddingVertical: space.md },
});
