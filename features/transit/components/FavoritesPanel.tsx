import { ArrowDown, X } from 'lucide-react-native';
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

export function FavoritesPanel({ onSelect }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const routes = useProfileStore((state) => state.favoriteRoutes);
  const removeFavorite = useProfileStore((state) => state.removeFavoriteRoute);

  return (
    <View style={styles.wrap}>
      <Text style={[typography.title, { color: theme.text, marginBottom: space.md }]}>
        {t('favoriteSearches')}
      </Text>
      {routes.length === 0 ? (
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
            elevation(1, theme.text),
          ]}
        >
          <Text style={[typography.body, { color: theme.muted, textAlign: 'center' }]}>
            {t('noFavoriteSearches')}
          </Text>
        </View>
      ) : (
        routes.map((route) => {
          const origin = capitalizeWords(route.origin);
          const destination = capitalizeWords(route.destination);
          return (
            <View
              key={`${route.origin}-${route.destination}-${route.createdAt}`}
              style={[
                styles.card,
                { backgroundColor: theme.card, borderColor: theme.border },
                elevation(1, theme.text),
              ]}
            >
              <Pressable
                style={styles.cardBody}
                onPress={() => onSelect(route.origin, route.destination)}
                accessibilityRole="button"
              >
                <Text style={[typography.headline, { color: theme.muted, textAlign: 'center' }]}>
                  {origin}
                </Text>
                <ArrowDown size={20} color={theme.primary} style={styles.arrow} />
                <Text style={[typography.headline, { color: theme.muted, textAlign: 'center' }]}>
                  {destination}
                </Text>
              </Pressable>
              <IconButton
                icon={X}
                variant="ghost"
                size="sm"
                color={theme.muted}
                accessibilityLabel={t('removeFavorites')}
                onPress={() => removeFavorite(route.origin, route.destination)}
                style={styles.remove}
              />
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.md },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.lg,
    marginBottom: space.md,
    position: 'relative',
  },
  cardBody: { alignItems: 'center' },
  arrow: { marginVertical: space.sm },
  remove: { position: 'absolute', top: space.sm, right: space.sm },
});
