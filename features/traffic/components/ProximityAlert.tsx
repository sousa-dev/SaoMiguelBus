import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { AppTheme } from '@/lib/theme';
import type { TrafficReport } from '@/lib/types';

/**
 * Foreground banner shown when an active report is near the driver. Push
 * notifications are intentionally out of scope — this is the in-app alert.
 */
export function ProximityAlert({
  report,
  theme,
  onPress,
  onDismiss,
}: {
  report: TrafficReport;
  theme: AppTheme;
  onPress?: () => void;
  onDismiss?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <View style={[styles.banner, { backgroundColor: theme.primary }]}>
      <Pressable style={styles.body} onPress={onPress} accessibilityRole="button">
        <Text style={styles.icon}>{report.category.icon || '⚠️'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('trafficAlertAhead')}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {report.category.name}
            {report.road ? ` · ${report.road}` : ''}
          </Text>
        </View>
      </Pressable>
      <Pressable onPress={onDismiss} hitSlop={10} accessibilityRole="button">
        <Text style={styles.dismiss}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { fontSize: 26 },
  title: { color: '#fff', fontWeight: '800', fontSize: 15 },
  subtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },
  dismiss: { color: '#fff', fontSize: 18, fontWeight: '700', paddingHorizontal: 4 },
});
