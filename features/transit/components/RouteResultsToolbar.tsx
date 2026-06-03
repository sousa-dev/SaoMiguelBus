import { Eye, Star } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { space, typography } from '@/lib/tokens';
import { useProfileStore } from '@/lib/profile-store';
import { useAppTheme } from '@/lib/theme';

type Props = {
  origin: string;
  destination: string;
  onShowFavorites: () => void;
};

export function RouteResultsToolbar({ origin, destination, onShowFavorites }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const isFavorite = useProfileStore((s) => s.isFavoriteRoute(origin, destination));
  const toggleFavorite = useProfileStore((s) => s.toggleFavoriteRoute);

  if (!origin.trim() || !destination.trim()) {
    return null;
  }

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
      <Pressable onPress={onShowFavorites} style={styles.showBtn} accessibilityRole="button">
        <Eye size={18} color={theme.info} />
        <Text style={[typography.label, { color: theme.info, marginLeft: space.sm }]}>
          {t('showFavorites')}
        </Text>
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
  favSide: { flexDirection: 'row', alignItems: 'center' },
});
