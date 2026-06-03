import { StyleSheet, View } from 'react-native';

import { ParishWeatherGridCard } from '@/features/weather/components/ParishWeatherGridCard';
import type { WeatherGridRow } from '@/features/weather/filterHelpers';
import type { ParishWeather } from '@/lib/types';
import { space } from '@/lib/tokens';
import type { AppTheme } from '@/lib/theme';

const GRID_COLUMNS = 4;

export function ParishWeatherGridRow({
  row,
  theme,
  isPinned,
  onTogglePin,
  onPressParish,
}: {
  row: WeatherGridRow;
  theme: AppTheme;
  isPinned: (slug: string) => boolean;
  onTogglePin: (parish: ParishWeather) => void;
  onPressParish: (slug: string) => void;
}) {
  const placeholders = GRID_COLUMNS - row.items.length;

  return (
    <View style={styles.row}>
      {row.items.map((parish) => (
        <View key={parish.slug} style={styles.cell}>
          <ParishWeatherGridCard
            parish={parish}
            theme={theme}
            isPinned={isPinned(parish.slug)}
            onTogglePin={() => onTogglePin(parish)}
            onPress={() => onPressParish(parish.slug)}
          />
        </View>
      ))}
      {placeholders > 0
        ? Array.from({ length: placeholders }, (_, index) => (
            <View key={`empty-${index}`} style={styles.cell} />
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.xs, marginBottom: space.sm },
  cell: { flex: 1, maxWidth: '25%', paddingHorizontal: 2 },
});
