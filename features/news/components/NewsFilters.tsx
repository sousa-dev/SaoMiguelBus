import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Chip } from '@/components/ui/Chip';
import { SearchField } from '@/components/ui/SearchField';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { NewsSource } from '@/lib/types';

export type NewsTabCategory = 'noticias' | 'pagamentos';

export function NewsFilters({
  query,
  category,
  sources,
  sourceId,
  onQueryChange,
  onCategoryChange,
  onSourceChange,
  onSearch,
}: {
  query: string;
  category: NewsTabCategory;
  sources: NewsSource[];
  sourceId: number | null;
  onQueryChange: (value: string) => void;
  onCategoryChange: (value: NewsTabCategory) => void;
  onSourceChange: (value: number | null) => void;
  onSearch: () => void;
}) {
  const theme = useAppTheme();
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
      {sources.length > 0 ? (
        <>
          <Text style={[typography.overline, styles.sourceLabel, { color: theme.muted }]}>
            {t('newsFilterSource')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sourceChips}
          >
            <Chip
              label={t('newsFilterAllSources')}
              selected={sourceId == null}
              onPress={() => onSourceChange(null)}
            />
            {sources.map((source) => (
              <Chip
                key={source.id}
                label={source.name}
                selected={sourceId === source.id}
                onPress={() => onSourceChange(source.id)}
              />
            ))}
          </ScrollView>
        </>
      ) : null}
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
  sourceLabel: { marginTop: space.sm, marginBottom: space.xs },
  sourceChips: { gap: space.sm, paddingRight: space.md },
  searchWrap: { marginTop: space.sm },
});
