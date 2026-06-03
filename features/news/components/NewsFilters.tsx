import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SearchField } from '@/components/ui/SearchField';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { space } from '@/lib/tokens';

export type NewsTabCategory = 'noticias' | 'pagamentos';

export function NewsFilters({
  query,
  category,
  onQueryChange,
  onCategoryChange,
  onSearch,
}: {
  query: string;
  category: NewsTabCategory;
  onQueryChange: (value: string) => void;
  onCategoryChange: (value: NewsTabCategory) => void;
  onSearch: () => void;
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      <SegmentedControl
        accessibilityLabel={t('newsTabListLabel')}
        options={[
          { value: 'noticias', label: t('newsTabNoticias') },
          { value: 'pagamentos', label: t('newsTabPagamentos') },
        ]}
        value={category}
        onChange={onCategoryChange}
      />
      <View style={styles.searchWrap}>
        <SearchField
          value={query}
          onChangeText={onQueryChange}
          placeholder={t('newsSearchPlaceholder')}
          accessibilityLabel={t('newsSearchPlaceholder')}
          onClear={onSearch}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.md, paddingHorizontal: space.md },
  searchWrap: { marginTop: space.sm },
});
