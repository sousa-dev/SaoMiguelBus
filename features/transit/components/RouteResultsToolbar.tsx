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
      {/* Two controls, so two pressables — each carrying its own label. The
          chevron used to sit flush against the right-hand label, which read as
          one long run of text and hid where either target began or ended. */}
      <Pressable
        onPress={onToggleFavorites}
        style={styles.half}
        accessibilityRole="button"
        accessibilityState={{ expanded: favoritesOpen }}
        accessibilityLabel={t('showFavorites')}
        hitSlop={8}
      >
        <Eye size={18} color={theme.info} />
        <Text
          numberOfLines={1}
          style={[typography.label, styles.halfLabel, { color: theme.info }]}
        >
          {t('showFavorites')}
        </Text>
        {favoriteCount > 0 ? (
          <View style={[styles.countBadge, { backgroundColor: theme.card }]}>
            <Text style={[typography.caption, styles.countText, { color: theme.muted }]}>
              {favoriteCount}
            </Text>
          </View>
        ) : null}
        <Chevron size={iconSize.md} color={theme.info} />
      </Pressable>

      <View style={[styles.divider, { backgroundColor: theme.warning }]} />

      {/* The label is part of the target: it names the action, so tapping it
          has to perform it. It was previously a bare Text next to a
          star-sized hit area. */}
      <Pressable
        onPress={() => toggleFavorite(origin, destination)}
        style={styles.half}
        accessibilityRole="button"
        accessibilityState={{ selected: isFavorite }}
        accessibilityLabel={isFavorite ? t('removeFavorites') : t('addFavorites')}
        hitSlop={8}
      >
        <Text
          numberOfLines={1}
          style={[typography.label, styles.halfLabelRight, { color: theme.text }]}
        >
          {isFavorite ? t('removeFavorites') : t('addFavorites')}
        </Text>
        <Star
          size={20}
          color={isFavorite ? theme.warning : theme.muted}
          fill={isFavorite ? theme.warning : 'transparent'}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: space.sm,
    marginBottom: space.md,
  },
  /**
   * Equal halves rather than `space-between`: the two labels are translated
   * independently and in PT both are long ("Mostrar Favoritos" / "Remover dos
   * Favoritos"), so free-flowing widths let one crowd the other off the bar.
   */
  half: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: space.md,
    paddingHorizontal: space.xs,
  },
  halfLabel: { flexShrink: 1 },
  // The right half reads toward its star, so its label pushes to the end.
  halfLabelRight: { flexShrink: 1, marginLeft: 'auto' },
  divider: {
    width: StyleSheet.hairlineWidth,
    marginVertical: space.sm,
    opacity: 0.4,
  },
  countBadge: {
    minWidth: 20,
    paddingHorizontal: space.xs,
    paddingVertical: 1,
    borderRadius: 10,
    alignItems: 'center',
  },
  countText: { fontWeight: '700' },
});
