import { X } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/IconButton';
import { elevation, space, typography } from '@/lib/tokens';
import { trafficCategoryIcon } from '@/lib/traffic-icons';
import type { AppTheme } from '@/lib/theme';
import type { TrafficReport } from '@/lib/types';

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
  const Icon = trafficCategoryIcon(report.category.slug);

  return (
    <View style={[styles.banner, elevation(3, theme.text), { backgroundColor: theme.primary }]}>
      <Pressable style={styles.body} onPress={onPress} accessibilityRole="button">
        <Icon size={28} color={theme.onPrimary} strokeWidth={2} />
        <View style={{ flex: 1 }}>
          <Text style={[typography.label, { color: theme.onPrimary }]}>{t('trafficAlertAhead')}</Text>
          <Text style={[typography.caption, { color: theme.onPrimary, opacity: 0.9 }]} numberOfLines={1}>
            {report.category.name}
            {report.road ? ` · ${report.road}` : ''}
          </Text>
        </View>
      </Pressable>
      <IconButton
        icon={X}
        variant="ghost"
        color={theme.onPrimary}
        accessibilityLabel={t('trafficClose')}
        onPress={onDismiss}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: space.md,
    left: space.md,
    right: space.md,
    borderRadius: 12,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
