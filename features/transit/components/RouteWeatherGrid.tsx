import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { weatherCodeEmoji } from '@/features/weather/weatherCodes';
import { track } from '@/lib/analytics';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { RouteWeatherCell } from '@/lib/types';

type Props = {
  origin: RouteWeatherCell;
  destination: RouteWeatherCell;
};

function RouteWeatherCellCompact({
  cell,
  role,
  label,
}: {
  cell: RouteWeatherCell;
  role: 'origin' | 'destination';
  label: string;
}) {
  const theme = useAppTheme();
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${cell.temperature != null ? `${Math.round(cell.temperature)} degrees` : 'unknown temperature'}`}
      onPress={() => {
        track('weather', 'engage', {
          action: 'route_weather_click',
          slug: cell.slug,
          role,
        });
        router.push({
          pathname: '/(tabs)/weather/[slug]',
          params: { slug: cell.slug, returnTo: '/(tabs)/transit' },
        });
      }}
      style={({ pressed }) => [styles.cell, { opacity: pressed ? 0.7 : 1 }]}
    >
      <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
      <Text style={styles.emoji}>{weatherCodeEmoji(cell.weatherCode)}</Text>
      <Text style={[styles.temp, { color: theme.muted }]}>
        {cell.temperature != null ? `${Math.round(cell.temperature)}°` : '—'}
      </Text>
    </Pressable>
  );
}

export function RouteWeatherGrid({ origin, destination }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.row, { borderTopColor: theme.border }]}>
      <RouteWeatherCellCompact cell={origin} role="origin" label={t('routeWeatherOrigin')} />
      <Text style={[styles.separator, { color: theme.border }]}>·</Text>
      <RouteWeatherCellCompact
        cell={destination}
        role="destination"
        label={t('routeWeatherDestination')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    marginTop: space.xs,
    marginBottom: space.xs,
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    ...typography.caption,
  },
  emoji: {
    fontSize: 14,
  },
  temp: {
    ...typography.caption,
    fontWeight: '600',
  },
  separator: {
    ...typography.caption,
    fontWeight: '700',
  },
});
