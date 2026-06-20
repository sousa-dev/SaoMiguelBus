import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SlidersHorizontal } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { SearchField } from '@/components/ui/SearchField';
import { Sheet } from '@/components/ui/Sheet';
import { MarketplaceFilterSheet } from '@/features/marketplace/components/MarketplaceFilterSheet';
import {
  countActiveMarketplaceFilters,
  hasActiveMarketplaceFilters,
  MARKETPLACE_SORTS,
  type MarketplaceListFilters,
  type MarketplaceSortKey,
} from '@/features/marketplace/filterHelpers';
import { iconSize, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { ServiceCategory } from '@/lib/types';

function sortLabelKey(sort: MarketplaceSortKey): string {
  switch (sort) {
    case 'random':
      return 'marketplaceSortRandom';
    case 'distance':
      return 'marketplaceSortNearest';
    case 'name':
      return 'marketplaceSortName';
    case 'rating':
      return 'marketplaceSortRating';
    case 'newest':
      return 'marketplaceSortNewest';
    default: {
      const _exhaustive: never = sort;
      return _exhaustive;
    }
  }
}

export function MarketplaceToolbar({
  categories,
  filters,
  onChangeFilters,
  onClearFilters,
  query,
  onChangeQuery,
  nearMeAvailable,
}: {
  categories: ServiceCategory[];
  filters: MarketplaceListFilters;
  onChangeFilters: (next: MarketplaceListFilters) => void;
  onClearFilters: () => void;
  query: string;
  onChangeQuery: (value: string) => void;
  nearMeAvailable: boolean;
}) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const activeCount = countActiveMarketplaceFilters(filters);
  const hasActive = hasActiveMarketplaceFilters(filters);

  const openSheet = () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setOpen(true);
  };

  const setSort = (sort: MarketplaceSortKey) => {
    onChangeFilters({ ...filters, sort });
  };

  const onNearMeToggleInSheet = (next: MarketplaceListFilters) => {
    if (next.nearMe && next.sort === 'random') {
      onChangeFilters({ ...next, sort: 'distance' });
      return;
    }
    onChangeFilters(next);
  };

  return (
    <View style={styles.wrap}>
      <SearchField
        value={query}
        onChangeText={onChangeQuery}
        placeholder={t('marketplaceSearchPlaceholder')}
        accessibilityLabel={t('marketplaceSearchPlaceholder')}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sortRow}
      >
        {MARKETPLACE_SORTS.map((sort) => {
          const disabled = sort === 'distance' && !nearMeAvailable;
          return (
            <Chip
              key={sort}
              label={t(sortLabelKey(sort))}
              selected={filters.sort === sort}
              disabled={disabled}
              onPress={() => setSort(sort)}
            />
          );
        })}
      </ScrollView>

      <View style={styles.row}>
        {hasActive ? (
          <Button label={t('marketplaceClearFilters')} variant="ghost" size="sm" onPress={onClearFilters} />
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('marketplaceFiltersTitle')}
          onPress={openSheet}
          style={({ pressed }) => [
            styles.trigger,
            {
              backgroundColor: hasActive ? theme.primary : theme.surfaceVariant,
              borderColor: hasActive ? theme.primary : theme.border,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <SlidersHorizontal
            size={iconSize.sm}
            color={hasActive ? theme.onPrimary : theme.muted}
            strokeWidth={2}
          />
          <Text style={[typography.label, { color: hasActive ? theme.onPrimary : theme.text }]}>
            {t('marketplaceFiltersTitle')}
          </Text>
          {activeCount > 0 ? (
            <View style={[styles.count, { backgroundColor: hasActive ? theme.onPrimary : theme.primary }]}>
              <Text
                style={[
                  typography.caption,
                  styles.countText,
                  { color: hasActive ? theme.primary : theme.onPrimary },
                ]}
              >
                {activeCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <Sheet visible={open} onClose={() => setOpen(false)} title={t('marketplaceFiltersTitle')}>
        <MarketplaceFilterSheet
          categories={categories}
          filters={filters}
          onChange={onNearMeToggleInSheet}
          onClear={onClearFilters}
        />
        <View style={styles.sheetActions}>
          <Button label={t('marketplaceFilterApply')} size="md" onPress={() => setOpen(false)} fullWidth />
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm, paddingHorizontal: space.md, paddingTop: space.md },
  sortRow: { gap: space.sm, paddingVertical: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: space.xs },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  count: {
    minWidth: 20,
    height: 20,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  countText: { fontWeight: '700' },
  sheetActions: { paddingHorizontal: space.lg, marginTop: space.md },
});
