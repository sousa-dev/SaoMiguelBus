import { ChevronDown, ChevronRight, Eye, Star } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { iconSize, space, typography } from '@/lib/tokens';
import { useProfileStore } from '@/lib/profile-store';
import { useAppTheme } from '@/lib/theme';

type Props = {
  origin: string;
  destination: string;
  /** Whether the favourites panel below this bar is currently open. */
  favoritesOpen: boolean;
  onToggleFavorites: () => void;
};

export function RouteResultsToolbar({
  origin,
  destination,
  favoritesOpen,
  onToggleFavorites,
}: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const isFavorite = useProfileStore((s) => s.isFavoriteRoute(origin, destination));
  const toggleFavorite = useProfileStore((s) => s.toggleFavoriteRoute);
  const favoriteCount = useProfileStore((s) => s.favoriteRoutes.length);

  if (!origin.trim() || !destination.trim()) {
    return null;
  }

  // Same collapsible vocabulary as the profile screen's sections and the stop
  // picker's village groups: chevron down = open, right = closed, with the
  // label held constant so the chevron is the only thing carrying the state.
  const Chevron = favoritesOpen ? ChevronDown : ChevronRight;

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.warningSurface,
          borderColor: theme.warning,
        },
      ]}
    >
      <Pressable
        onPress={onToggleFavorites}
        style={styles.showBtn}
        accessibilityRole="button"
        accessibilityState={{ expanded: favoritesOpen }}
        accessibilityLabel={t('showFavorites')}
        hitSlop={8}
      >
        <Eye size={18} color={theme.info} />
        <Text style={[typography.label, { color: theme.info, marginLeft: space.sm }]}>
          {t('showFavorites')}
        </Text>
        {favoriteCount > 0 ? (
          <View style={[styles.countBadge, { backgroundColor: theme.card }]}>
            <Text style={[typography.caption, styles.countText, { color: theme.muted }]}>
              {favoriteCount}
            </Text>
          </View>
        ) : null}
        <Chevron size={iconSize.md} color={theme.info} style={styles.chevron} />
      </Pressable>
      <View style={styles.favSide}>
        <Text style={[typography.caption, { color: theme.muted, marginRight: space.sm }]}>
          {isFavorite ? t('removeFavorites') : t('addFavorites')}
        </Text>
        <Pressable
          onPress={() => toggleFavorite(origin, destination)}
          accessibilityRole="button"
          accessibilityLabel={isFavorite ? t('removeFavorites') : t('addFavorites')}
        >
          <Star size={22} color={isFavorite ? theme.warning : theme.muted} fill={isFavorite ? theme.warning : 'transparent'} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    marginBottom: space.md,
  },
  showBtn: { flexDirection: 'row', alignItems: 'center' },
  countBadge: {
    marginLeft: space.sm,
    minWidth: 20,
    paddingHorizontal: space.xs,
    paddingVertical: 1,
    borderRadius: 10,
    alignItems: 'center',
  },
  countText: { fontWeight: '700' },
  chevron: { marginLeft: space.xs },
  favSide: { flexDirection: 'row', alignItems: 'center' },
});
