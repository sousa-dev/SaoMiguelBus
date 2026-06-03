import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Sheet } from '@/components/ui/Sheet';
import { trafficCategoryIcon } from '@/lib/traffic-icons';
import { space, typography } from '@/lib/tokens';
import type { AppTheme } from '@/lib/theme';
import type { TrafficCategory } from '@/lib/types';

export function CategoryPickerSheet({
  visible,
  categories,
  theme,
  pending,
  onPick,
  onAddDetails,
  onPickOnMap,
  onClose,
}: {
  visible: boolean;
  categories: TrafficCategory[];
  theme: AppTheme;
  pending: boolean;
  onPick: (category: TrafficCategory) => void;
  onAddDetails: () => void;
  onPickOnMap: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Sheet visible={visible} onClose={onClose} title={t('trafficReportTitle')}>
      <Text style={[typography.body, { color: theme.muted, marginBottom: space.lg, paddingHorizontal: space.lg }]}>
        {t('trafficReportHint')}
      </Text>
      <View style={[styles.grid, { paddingHorizontal: space.lg }]}>
        {categories.map((category) => {
          const Icon = trafficCategoryIcon(category.slug);
          return (
            <Pressable
              key={category.id}
              disabled={pending}
              onPress={() => onPick(category)}
              style={[styles.chip, { borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
            >
              <Icon size={28} color={theme.primary} strokeWidth={2} />
              <Text style={[typography.caption, { color: theme.text, marginTop: space.xs }]} numberOfLines={1}>
                {category.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {pending ? <ActivityIndicator color={theme.primary} style={{ marginTop: space.lg }} /> : null}
      <Pressable onPress={onPickOnMap} style={{ marginTop: space.lg, paddingHorizontal: space.lg }}>
        <Text style={[typography.label, { color: theme.primary, textAlign: 'center' }]}>{t('trafficPickOnMap')}</Text>
      </Pressable>
      <Pressable onPress={onAddDetails} style={{ marginTop: space.md, paddingHorizontal: space.lg }}>
        <Text style={[typography.label, { color: theme.muted, textAlign: 'center' }]}>{t('trafficAddDetails')}</Text>
      </Pressable>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    width: 92,
    paddingVertical: space.md,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
});
