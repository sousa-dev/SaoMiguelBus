import { ChevronRight, Pin, PinOff } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/IconButton';
import { weatherCodeEmoji, weatherCodeLabelKey } from '@/features/weather/weatherCodes';
import type { ParishWeather } from '@/lib/types';
import { radius, space, typography } from '@/lib/tokens';
import type { AppTheme } from '@/lib/theme';

export function ParishWeatherCard({
  parish,
  theme,
  isPinned,
  onTogglePin,
  onPress,
  compact,
}: {
  parish: ParishWeather;
  theme: AppTheme;
  isPinned: boolean;
  onTogglePin: () => void;
  onPress: () => void;
  /** Narrow card for horizontal pinned strip */
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const temp = parish.current?.temperature;
  const code = parish.current?.weatherCode;
  const daily = parish.daily?.[0];
  const hi = daily?.tempMax;
  const lo = daily?.tempMin;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        compact ? styles.cardCompact : null,
        {
          backgroundColor: theme.card,
          borderColor: isPinned ? theme.primary : theme.border,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.row}>
        <Text style={styles.emoji}>{weatherCodeEmoji(code)}</Text>
        <View style={styles.body}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {parish.name}
          </Text>
          {!compact ? (
            <Text style={[styles.concelho, { color: theme.muted }]} numberOfLines={1}>
              {parish.concelho}
            </Text>
          ) : null}
          <Text style={[styles.condition, { color: theme.muted }]} numberOfLines={1}>
            {t(weatherCodeLabelKey(code))}
          </Text>
        </View>
        <View style={styles.tempCol}>
          {temp != null ? (
            <Text style={[styles.temp, { color: theme.text }]}>
              {t('weatherCurrentTemp', { temp: Math.round(temp) })}
            </Text>
          ) : (
            <Text style={{ color: theme.muted }}>—</Text>
          )}
          {hi != null && lo != null ? (
            <Text style={[styles.hilo, { color: theme.muted }]}>
              {t('weatherHiLo', { min: Math.round(lo), max: Math.round(hi) })}
            </Text>
          ) : null}
        </View>
        <IconButton
          icon={isPinned ? Pin : PinOff}
          variant="ghost"
          size="sm"
          color={isPinned ? theme.primary : theme.muted}
          accessibilityLabel={t(isPinned ? 'weatherUnpinParish' : 'weatherPinParish', { name: parish.name })}
          onPress={onTogglePin}
        />
        {!compact ? <ChevronRight color={theme.muted} size={20} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.sm,
  },
  cardCompact: {
    width: 260,
    marginBottom: 0,
    marginRight: space.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  emoji: { fontSize: 28, width: 36, textAlign: 'center' },
  body: { flex: 1, minWidth: 0 },
  name: { ...typography.body, fontWeight: '700' },
  concelho: { fontSize: 12, marginTop: 2 },
  condition: { fontSize: 11, marginTop: 2 },
  tempCol: { alignItems: 'flex-end' },
  temp: { fontSize: 18, fontWeight: '700' },
  hilo: { fontSize: 11, marginTop: 2 },
});
