import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { trafficCategoryIcon } from '@/lib/traffic-icons';
import { onColorFor } from '@/lib/color-utils';
import { elevation } from '@/lib/tokens';
import type { AppTheme } from '@/lib/theme';
import type { TrafficReport } from '@/lib/types';

const CATEGORY_COLORS: Record<string, keyof AppTheme> = {
  acidente: 'danger',
  transito: 'warning',
  radar: 'secondary',
  policia: 'info',
  obras: 'accent',
  desvio: 'success',
  inundacao: 'info',
  perigo: 'danger',
  tempo: 'muted',
};

export function TrafficMapMarker({
  report,
  theme,
  onPress,
}: {
  report: TrafficReport;
  theme: AppTheme;
  onPress?: () => void;
}) {
  const slug = report.category.slug;
  const colorKey = CATEGORY_COLORS[slug] ?? 'primary';
  const bg = theme[colorKey] as string;
  const onBg = onColorFor(bg);
  const Icon = trafficCategoryIcon(slug);

  return (
    <Marker
      coordinate={{ latitude: report.latitude, longitude: report.longitude }}
      onPress={onPress}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={[styles.marker, elevation(2, theme.text), { backgroundColor: bg, borderColor: onBg }]}>
        <Icon size={18} color={onBg} strokeWidth={2.5} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});
