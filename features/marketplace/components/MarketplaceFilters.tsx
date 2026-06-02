import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { ServiceCategory } from '@/lib/types';
import type { AppTheme } from '@/lib/theme';

export function MarketplaceFilters({
  theme,
  categories,
  activeCategory,
  query,
  nearMe,
  onChangeQuery,
  onSelectCategory,
  onToggleNearMe,
}: {
  theme: AppTheme;
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
      <TextInput
        value={query}
        onChangeText={onChangeQuery}
        placeholder={t('marketplaceSearchPlaceholder')}
        placeholderTextColor={theme.muted}
        style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.card }]}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip
          theme={theme}
          label={t('marketplaceAllCategories')}
          active={activeCategory === null}
          onPress={() => onSelectCategory(null)}
        />
        <Chip
          theme={theme}
          label={t('marketplaceNearMe')}
          active={nearMe}
          onPress={onToggleNearMe}
        />
        {categories.map((cat) => (
          <Chip
            key={cat.slug}
            theme={theme}
            label={cat.name}
            active={activeCategory === cat.slug}
            onPress={() => onSelectCategory(activeCategory === cat.slug ? null : cat.slug)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function Chip({
  theme,
  label,
  active,
  onPress,
}: {
  theme: AppTheme;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? theme.primary : theme.card,
          borderColor: active ? theme.primary : theme.border,
        },
      ]}
    >
      <Text style={{ color: active ? '#fff' : theme.text, fontWeight: '600', fontSize: 13 }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  chips: { gap: 8, paddingVertical: 2 },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
});
