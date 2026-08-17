import { ArrowRight, X } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/IconButton';
import { elevation, radius, space, typography } from '@/lib/tokens';
import { useProfileStore } from '@/lib/profile-store';
import { useAppTheme } from '@/lib/theme';

type Props = {
  onSelect: (origin: string, destination: string) => void;
};

function capitalizeWords(value: string) {
  const prepositions = new Set(['de', 'da', 'do', 'dos', 'das']);
  return value
    .split(' ')
    .map((word) =>
      prepositions.has(word.toLowerCase()) ? word : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ');
}

/**
 * The saved searches, opened from the results toolbar.
 *
 * One card, one row per favourite — not a card each. This panel appears BELOW
 * a list of results the rider is already reading, so every row it costs is a
 * row of the answer pushed off screen; a stacked-card layout with a vertical
 * arrow spent roughly three lines on what is one line of information. Picking a
 * row scrolls the screen back to the search form (see `applySearch` in the
 * transit screen), because the visible effect of the tap happens up there.
 */
export function FavoritesPanel({ onSelect }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const routes = useProfileStore((state) => state.favoriteRoutes);
  const removeFavorite = useProfileStore((state) => state.removeFavoriteRoute);

  return (
    <View style={styles.wrap}>
      <Text style={[typography.label, { color: theme.muted, marginBottom: space.xs }]}>
        {t('favoriteSearches')}
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.card, borderColor: theme.border },
          elevation(1, theme.text),
        ]}
      >
        {routes.length === 0 ? (
          <Text style={[typography.body, styles.empty, { color: theme.muted }]}>
            {t('noFavoriteSearches')}
          </Text>
        ) : (
          routes.map((route, index) => (
            <View
              key={`${route.origin}-${route.destination}-${route.createdAt}`}
              style={[
                styles.row,
                index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border } : null,
              ]}
            >
              <Pressable
                style={styles.rowBody}
                onPress={() => onSelect(route.origin, route.destination)}
                accessibilityRole="button"
                accessibilityLabel={`${route.origin} → ${route.destination}`}
              >
                {/* Each side truncates on its own, so a long origin cannot
                    squeeze the destination out of the row entirely. */}
                <Text
                  numberOfLines={1}
                  style={[typography.body, styles.endpoint, { color: theme.text }]}
                >
                  {capitalizeWords(route.origin)}
                </Text>
                <ArrowRight size={14} color={theme.primary} style={styles.arrow} />
                <Text
                  numberOfLines={1}
                  style={[typography.body, styles.endpoint, { color: theme.text }]}
                >
                  {capitalizeWords(route.destination)}
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
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.md },
  card: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  empty: { padding: space.md, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: space.md,
    paddingRight: space.xs,
  },
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.sm,
  },
  endpoint: { flexShrink: 1 },
  arrow: { marginHorizontal: space.sm },
});
