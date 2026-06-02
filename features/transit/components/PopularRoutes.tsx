import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useProfileStore } from '@/lib/profile-store';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

const DEFAULT_ROUTES: { origin: string; destination: string }[] = [
  { origin: 'Ponta Delgada', destination: 'Ribeira Grande' },
  { origin: 'Ponta Delgada', destination: 'Lagoa' },
  { origin: 'Ponta Delgada', destination: 'Vila Franca do Campo' },
];

type Props = {
  onSelect: (origin: string, destination: string) => void;
};

export function PopularRoutes({ onSelect }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const favorites = useProfileStore((s) => s.favoriteRoutes);
  const routes =
    favorites.length > 0
      ? favorites.slice(0, 4).map((f) => ({ origin: f.origin, destination: f.destination }))
      : DEFAULT_ROUTES;

  return (
    <View style={styles.wrap}>
      <Text style={[typography.label, { color: theme.text, marginBottom: space.sm }]}>
        {t('routesPopularTitle')}
      </Text>
      <View style={styles.chips}>
        {routes.map((route) => (
          <Pressable
            key={`${route.origin}-${route.destination}`}
            onPress={() => onSelect(route.origin, route.destination)}
            style={[styles.chip, { borderColor: theme.border, backgroundColor: theme.card }]}
          >
            <Text style={[typography.caption, { color: theme.primary }]}>
              {route.origin} → {route.destination}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingVertical: space.xs,
    paddingHorizontal: space.md,
  },
});
