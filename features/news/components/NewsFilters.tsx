import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Chip } from '@/components/ui/Chip';
import { SearchField } from '@/components/ui/SearchField';
import { space } from '@/lib/tokens';

const CATEGORIES = ['', 'local', 'politics', 'culture', 'sports'] as const;

export function NewsFilters({
  query,
  category,
  onQueryChange,
  onCategoryChange,
  onSearch,
}: {
  query: string;
  category: string;
  onQueryChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onSearch: () => void;
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      <SearchField
        value={query}
        onChangeText={onQueryChange}
        placeholder={t('newsSearchPlaceholder')}
        accessibilityLabel={t('newsSearchPlaceholder')}
        onClear={onSearch}
      />
      <View style={styles.chips}>
        {CATEGORIES.map((cat) => {
          const label = cat ? cat : t('newsAllCategories');
          return (
            <Chip key={cat || 'all'} label={label} selected={category === cat} onPress={() => onCategoryChange(cat)} />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.md, paddingHorizontal: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space.sm },
});
