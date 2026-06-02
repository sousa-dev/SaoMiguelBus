import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useFavoritesStore } from '@/lib/favorites-store';
import { useAppTheme } from '@/lib/theme';

type Props = {
  onSelect: (origin: string, destination: string) => void;
};

export function FavoritesPanel({ onSelect }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const routes = useFavoritesStore((state) => state.routes);
  const removeFavorite = useFavoritesStore((state) => state.removeFavorite);
  const [open, setOpen] = useState(false);

  if (routes.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setOpen((value) => !value)}
        style={[styles.toggle, { borderColor: theme.border, backgroundColor: theme.card }]}
      >
        <Text style={{ color: theme.primary, fontWeight: '600' }}>
          {open ? '▾' : '▸'} {t('showFavorites')} ({routes.length})
        </Text>
      </Pressable>
      {open ? (
        <View style={[styles.panel, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <Text style={[styles.title, { color: theme.text }]}>{t('favoriteSearches')}</Text>
          {routes.map((route) => (
            <View key={`${route.origin}-${route.destination}-${route.createdAt}`} style={styles.row}>
              <Pressable
                style={styles.routePress}
                onPress={() => onSelect(route.origin, route.destination)}
              >
                <Text style={{ color: theme.text }}>
                  {route.origin} → {route.destination}
                </Text>
              </Pressable>
              <Pressable onPress={() => removeFavorite(route.origin, route.destination)}>
                <Text style={{ color: theme.muted }}>✕</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8 },
  toggle: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  panel: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  title: { fontWeight: '700', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routePress: { flex: 1, paddingVertical: 4 },
});
