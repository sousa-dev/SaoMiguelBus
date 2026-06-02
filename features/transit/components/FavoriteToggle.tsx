import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useFavoritesStore } from '@/lib/favorites-store';
import { useAppTheme } from '@/lib/theme';

type Props = {
  origin: string;
  destination: string;
};

export function FavoriteToggle({ origin, destination }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const isFavorite = useFavoritesStore((state) => state.isFavorite(origin, destination));
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);

  if (!origin.trim() || !destination.trim()) {
    return null;
  }

  return (
    <Pressable
      onPress={() => toggleFavorite(origin, destination)}
      style={[styles.btn, { borderColor: theme.border, backgroundColor: theme.card }]}
      accessibilityRole="button"
      accessibilityState={{ selected: isFavorite }}
    >
      <Text style={{ color: theme.primary, fontWeight: '600' }}>
        {isFavorite ? '★' : '☆'} {isFavorite ? t('removeFavorites') : t('addFavorites')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
});
