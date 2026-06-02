import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { AppTheme } from '@/lib/theme';

const CATEGORIES = ['', 'local', 'politics', 'culture', 'sports'] as const;

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
  category: string;
  onQueryChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onSearch: () => void;
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      <TextInput
        style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.card }]}
        value={query}
        onChangeText={onQueryChange}
        placeholder={t('newsSearchPlaceholder')}
        placeholderTextColor={theme.muted}
        onSubmitEditing={onSearch}
        returnKeyType="search"
      />
      <View style={styles.chips}>
        {CATEGORIES.map((cat) => {
          const active = category === cat;
          const label = cat ? cat : t('newsAllCategories');
          return (
            <Pressable
              key={cat || 'all'}
              onPress={() => onCategoryChange(cat)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? theme.primary : theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={{ color: active ? '#fff' : theme.text, fontSize: 12 }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
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
    marginBottom: 10,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
