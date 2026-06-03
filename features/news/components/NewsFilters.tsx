import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { AppTheme } from '@/lib/theme';

export type NewsTabCategory = 'noticias' | 'pagamentos';

const TABS: NewsTabCategory[] = ['noticias', 'pagamentos'];

const TAB_LABEL_KEYS: Record<NewsTabCategory, 'newsTabNoticias' | 'newsTabPagamentos'> = {
  noticias: 'newsTabNoticias',
  pagamentos: 'newsTabPagamentos',
};

export function NewsFilters({
  theme,
  query,
  category,
  onQueryChange,
  onCategoryChange,
  onSearch,
}: {
  theme: AppTheme;
  query: string;
  category: NewsTabCategory;
  onQueryChange: (value: string) => void;
  onCategoryChange: (value: NewsTabCategory) => void;
  onSearch: () => void;
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.wrap} accessibilityLabel={t('newsTabListLabel')}>
      <View style={styles.chips}>
        {TABS.map((tab) => {
          const active = category === tab;
          return (
            <Pressable
              key={tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => onCategoryChange(tab)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? theme.primary : theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={{ color: active ? '#fff' : theme.text, fontSize: 12 }}>
                {t(TAB_LABEL_KEYS[tab])}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.card }]}
        value={query}
        onChangeText={onQueryChange}
        placeholder={t('newsSearchPlaceholder')}
        placeholderTextColor={theme.muted}
        onSubmitEditing={onSearch}
        returnKeyType="search"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
});
