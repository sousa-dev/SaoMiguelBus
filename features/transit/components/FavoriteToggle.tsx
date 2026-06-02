import { Star } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/IconButton';
import { space, typography } from '@/lib/tokens';
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
    <View style={[styles.row, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <IconButton
        icon={Star}
        accessibilityLabel={isFavorite ? t('removeFavorites') : t('addFavorites')}
        color={isFavorite ? theme.accent : theme.muted}
        onPress={() => toggleFavorite(origin, destination)}
      />
      <Text style={[typography.label, { color: theme.text }]}>
        {isFavorite ? t('removeFavorites') : t('addFavorites')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: space.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    gap: space.sm,
  },
});
