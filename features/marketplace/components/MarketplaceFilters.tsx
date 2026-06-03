import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Chip } from '@/components/ui/Chip';
import { SearchField } from '@/components/ui/SearchField';
import { space } from '@/lib/tokens';
import type { ServiceCategory } from '@/lib/types';

export function MarketplaceFilters({
  categories,
  activeCategory,
  query,
  nearMe,
  onChangeQuery,
  onSelectCategory,
  onToggleNearMe,
}: {
  categories: ServiceCategory[];
  activeCategory: string | null;
  query: string;
  nearMe: boolean;
  onChangeQuery: (value: string) => void;
  onSelectCategory: (slug: string | null) => void;
  onToggleNearMe: () => void;
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      <SearchField
        value={query}
        onChangeText={onChangeQuery}
        placeholder={t('marketplaceSearchPlaceholder')}
        accessibilityLabel={t('marketplaceSearchPlaceholder')}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip
          label={t('marketplaceAllCategories')}
          selected={activeCategory === null}
          onPress={() => onSelectCategory(null)}
        />
        <Chip label={t('marketplaceNearMe')} selected={nearMe} onPress={onToggleNearMe} />
        {categories.map((cat) => (
          <Chip
            key={cat.slug}
            label={cat.name}
            selected={activeCategory === cat.slug}
            onPress={() => onSelectCategory(activeCategory === cat.slug ? null : cat.slug)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.sm, paddingHorizontal: space.md, paddingTop: space.md },
  chips: { paddingVertical: space.sm },
});
