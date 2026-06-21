import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
  onPick,
  onClose,
}: {
  visible: boolean;
  categories: TrafficCategory[];
  theme: AppTheme;
  onPick: (category: TrafficCategory) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Sheet visible={visible} onClose={onClose} title={t('trafficReportTitle')}>
      <Text style={[typography.body, { color: theme.muted, marginBottom: space.lg, paddingHorizontal: space.lg }]}>
        {t('trafficPickCategory')}
      </Text>
      <View style={[styles.grid, { paddingHorizontal: space.lg }]}>
        {categories.map((category) => {
          const Icon = trafficCategoryIcon(category.slug);
          return (
            <Pressable
              key={category.id}
              onPress={() => onPick(category)}
              accessibilityRole="button"
              accessibilityLabel={category.name}
              style={[styles.chip, { borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
            >
              <Icon size={32} color={theme.primary} strokeWidth={2} />
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: space.sm,
  },
  chip: {
    width: '31%',
    aspectRatio: 1.2,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
