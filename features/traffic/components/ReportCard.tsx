import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '@/lib/theme';
import type { TrafficReport } from '@/lib/types';

export function ReportCard({
  report,
  theme,
  onPress,
}: {
  report: TrafficReport;
  theme: AppTheme;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      <Text style={styles.icon}>{report.category.icon || '⚠️'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: theme.text }]}>{report.category.name}</Text>
        {report.road ? <Text style={{ color: theme.muted, fontSize: 13 }}>{report.road}</Text> : null}
        {report.description ? (
          <Text style={{ color: theme.muted, fontSize: 13 }} numberOfLines={2}>
            {report.description}
          </Text>
        ) : null}
      </View>
      <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '700' }}>
        ✓{report.confidence.confirm}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  icon: { fontSize: 26 },
  name: { fontSize: 15, fontWeight: '700' },
});
