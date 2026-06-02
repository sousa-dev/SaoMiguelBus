import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';

import type { AppTheme } from '@/lib/theme';
import type { TrafficReport } from '@/lib/types';

/** Distinct marker colors per category slug (seeded defaults + fallback). */
const CATEGORY_MARKER_COLORS: Record<string, string> = {
  acidente: '#C62828',
  transito: '#E65100',
  radar: '#6A1B9A',
  policia: '#1565C0',
  obras: '#F9A825',
  desvio: '#00695C',
  inundacao: '#0277BD',
  perigo: '#AD1457',
  tempo: '#546E7A',
};

export function markerColorForCategory(slug: string, theme: AppTheme) {
  return CATEGORY_MARKER_COLORS[slug] ?? theme.primary;
}

type Props = {
  report: TrafficReport;
  theme: AppTheme;
  onPress?: () => void;
};

export function TrafficMapMarker({ report, theme, onPress }: Props) {
  const { category } = report;
  const fill = markerColorForCategory(category.slug, theme);
  const scheduled = report.status === 'scheduled';

  return (
    <Marker
      coordinate={{ latitude: report.latitude, longitude: report.longitude }}
      title={`${category.icon} ${category.name}`}
      description={report.description || report.road || undefined}
      onPress={onPress}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View
        style={[
          styles.bubble,
          { backgroundColor: fill },
          scheduled && { borderColor: theme.accent, borderWidth: 3 },
        ]}
      >
        <Text style={styles.icon}>{category.icon || '⚠️'}</Text>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  bubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  icon: { fontSize: 20, lineHeight: 24 },
});
