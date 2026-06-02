import { ChevronDown, ChevronRight, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/IconButton';
import { radius, space, typography } from '@/lib/tokens';
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

  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setOpen((value) => !value)}
        style={[styles.toggle, { borderColor: theme.border, backgroundColor: theme.card }]}
      >
        <Chevron size={18} color={theme.primary} />
        <Text style={[typography.label, { color: theme.primary }]}>
          {t('showFavorites')} ({routes.length})
        </Text>
      </Pressable>
      {open ? (
        <View style={[styles.panel, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <Text style={[typography.label, { color: theme.text, marginBottom: space.sm }]}>
            {t('favoriteSearches')}
          </Text>
          {routes.map((route) => (
            <View key={`${route.origin}-${route.destination}-${route.createdAt}`} style={styles.row}>
              <Pressable style={styles.routePress} onPress={() => onSelect(route.origin, route.destination)}>
                <Text style={[typography.body, { color: theme.text }]}>
                  {route.origin} → {route.destination}
                </Text>
              </Pressable>
              <IconButton
                icon={X}
                variant="ghost"
                size="sm"
                color={theme.muted}
                accessibilityLabel={t('removeFavorites')}
                onPress={() => removeFavorite(route.origin, route.destination)}
              />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: space.sm },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
  },
  panel: {
    marginTop: space.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  routePress: { flex: 1, paddingVertical: space.xs },
});
