import { Check } from 'lucide-react-native';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { iconSize, space, typography } from '@/lib/tokens';
import { trafficCategoryIcon } from '@/lib/traffic-icons';
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
  const Icon = trafficCategoryIcon(report.category.slug);

  return (
    <Card onPress={onPress} style={styles.card}>
      <Icon size={iconSize.xl} color={theme.primary} strokeWidth={2} />
      <View style={{ flex: 1 }}>
        <Text style={[typography.bodyStrong, { color: theme.text }]}>{report.category.name}</Text>
        {report.road ? <Text style={[typography.caption, { color: theme.muted }]}>{report.road}</Text> : null}
        {report.description ? (
          <Text style={[typography.caption, { color: theme.muted }]} numberOfLines={2}>
            {report.description}
          </Text>
        ) : null}
      </View>
      <View style={styles.confidence}>
        <Check size={14} color={theme.success} strokeWidth={2.5} />
        <Text style={[typography.caption, { color: theme.primary, fontWeight: '700' }]}>
          {report.confidence.confirm}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.md },
  confidence: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
