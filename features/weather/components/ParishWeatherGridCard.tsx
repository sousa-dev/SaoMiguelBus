import { Pin, PinOff } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/IconButton';
import { weatherCodeEmoji, weatherCodeLabelKey } from '@/features/weather/weatherCodes';
import type { ParishWeather } from '@/lib/types';
import { radius, space, typography } from '@/lib/tokens';
import type { AppTheme } from '@/lib/theme';

export function ParishWeatherGridCard({
  parish,
  theme,
  isPinned,
  onTogglePin,
  onPress,
}: {
  parish: ParishWeather;
  theme: AppTheme;
  isPinned: boolean;
  onTogglePin: () => void;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const temp = parish.current?.temperature;
  const code = parish.current?.weatherCode;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: isPinned ? theme.primary : theme.border,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.pinRow}>
        <IconButton
          icon={isPinned ? Pin : PinOff}
          variant="ghost"
          size="sm"
          color={isPinned ? theme.primary : theme.muted}
          accessibilityLabel={t(isPinned ? 'weatherUnpinParish' : 'weatherPinParish', { name: parish.name })}
          onPress={onTogglePin}
        />
      </View>
      <Text style={styles.emoji}>{weatherCodeEmoji(code)}</Text>
      <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>
        {parish.name}
      </Text>
      {temp != null ? (
        <Text style={[styles.temp, { color: theme.text }]}>
          {t('weatherCurrentTemp', { temp: Math.round(temp) })}
        </Text>
      ) : (
        <Text style={{ color: theme.muted, fontSize: 12 }}>—</Text>
      )}
      <Text style={[styles.condition, { color: theme.muted }]} numberOfLines={1}>
        {t(weatherCodeLabelKey(code))}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.xs,
    paddingTop: space.sm,
    alignItems: 'center',
    minHeight: 118,
  },
  pinRow: { alignSelf: 'flex-end', marginTop: -space.xs, marginRight: -space.xs },
  emoji: { fontSize: 22, marginBottom: 2 },
  name: { ...typography.caption, fontWeight: '700', textAlign: 'center', minHeight: 28 },
  temp: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  condition: { fontSize: 9, marginTop: 2, textAlign: 'center' },
});
