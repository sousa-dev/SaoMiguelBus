import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { SearchField } from '@/components/ui/SearchField';
import {
  hasActiveMarketplaceFilters,
  shouldShowMarketplaceRatingWarning,
  type MarketplaceListFilters,
} from '@/features/marketplace/filterHelpers';
import { normalizeSearchText } from '@/features/trails/filterHelpers';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { ServiceCategory } from '@/lib/types';

const MIN_RATING_OPTIONS = [0, 3, 4, 4.5] as const;

export function MarketplaceFilterSheet({
  categories,
  filters,
  onChange,
  onClear,
  reviewedShare,
}: {
  categories: ServiceCategory[];
  filters: MarketplaceListFilters;
  onChange: (next: MarketplaceListFilters) => void;
  onClear: () => void;
  reviewedShare?: number;
}) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [categoryQuery, setCategoryQuery] = useState('');

  const filteredCategories = useMemo(() => {
    const q = normalizeSearchText(categoryQuery);
    if (!q) {
      return categories;
    }
    return categories.filter(
      (cat) =>
        normalizeSearchText(cat.name).includes(q) || normalizeSearchText(cat.slug).includes(q),
    );
  }, [categories, categoryQuery]);

  const showClear = hasActiveMarketplaceFilters(filters);
  const showRatingWarning = shouldShowMarketplaceRatingWarning(filters, reviewedShare);

  return (
    <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <Text style={[typography.overline, styles.groupLabel, { color: theme.muted }]}>
        {t('marketplaceFilterCategory')}
      </Text>
      <View style={styles.categorySearch}>
        <SearchField
          value={categoryQuery}
          onChangeText={setCategoryQuery}
          placeholder={t('marketplaceFilterCategorySearch')}
          accessibilityLabel={t('marketplaceFilterCategorySearch')}
        />
      </View>
      <View style={styles.chips}>
        <Chip
          label={t('marketplaceAllCategories')}
          selected={!filters.category}
          onPress={() => onChange({ ...filters, category: undefined })}
        />
        {filteredCategories.map((cat) => (
          <Chip
            key={cat.slug}
            label={cat.icon ? `${cat.icon} ${cat.name}` : cat.name}
            selected={filters.category === cat.slug}
            onPress={() =>
              onChange({
                ...filters,
                category: filters.category === cat.slug ? undefined : cat.slug,
              })
            }
          />
        ))}
      </View>

      <Text style={[typography.overline, styles.groupLabel, { color: theme.muted }]}>
        {t('marketplaceMinRating')}
      </Text>
      {showRatingWarning ? (
        <View style={styles.warningWrap}>
          <Banner message={t('marketplaceMinRatingWarning')} variant="warning" />
        </View>
      ) : null}
      <View style={styles.chips}>
        {MIN_RATING_OPTIONS.map((value) => (
          <Chip
            key={value}
            label={value === 0 ? t('marketplaceFilterAll') : `${value}+ ★`}
            selected={(filters.minRating ?? 0) === value}
            onPress={() =>
              onChange({ ...filters, minRating: value === 0 ? undefined : value })
            }
          />
        ))}
      </View>

      <Text style={[typography.overline, styles.groupLabel, { color: theme.muted }]}>
        {t('marketplaceFilterMore')}
      </Text>
      <View style={styles.chips}>
        <Chip
          label={t('marketplaceHasRate')}
          selected={Boolean(filters.hasRate)}
          onPress={() => onChange({ ...filters, hasRate: !filters.hasRate || undefined })}
        />
        <Chip
          label={t('marketplaceVerifiedOnly')}
          selected={Boolean(filters.verified)}
          onPress={() => onChange({ ...filters, verified: !filters.verified || undefined })}
        />
      </View>

      {showClear ? (
        <Button
          label={t('marketplaceClearFilters')}
          variant="outline"
          size="sm"
          onPress={onClear}
          style={styles.clear}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.xl, paddingBottom: space.lg },
  groupLabel: { marginTop: space.md, marginBottom: space.sm },
  categorySearch: { marginBottom: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  warningWrap: { marginBottom: space.sm },
  clear: { marginTop: space.lg, alignSelf: 'flex-start' },
});
