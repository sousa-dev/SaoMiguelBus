import { useRouter } from 'expo-router';
import { Bus, ChevronRight } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
import { withAlpha } from '@/lib/color-utils';
import { getModule } from '@/lib/modules';
import { useProfileStore } from '@/lib/profile-store';
import { iconSize, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

export function HomeBusCta() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const pinned = useProfileStore((s) => s.tracking.pinned);
  const favoriteRoutes = useProfileStore((s) => s.favoriteRoutes);
  const recentSearches = useProfileStore((s) => s.recentSearches);
  const accent = getModule('transit')?.accent ?? theme.primary;

  const suggested =
    pinned[0] != null
      ? { origin: pinned[0].origin, destination: pinned[0].destination }
      : favoriteRoutes[0] != null
        ? { origin: favoriteRoutes[0].origin, destination: favoriteRoutes[0].destination }
        : recentSearches[0] != null
          ? {
              origin: recentSearches[0].origin,
              destination: recentSearches[0].destination,
            }
          : null;

  const destination = suggested?.destination ?? null;
  const title = destination ? t('homeBusCtaTitle', { destino: destination }) : t('homeBusCtaGeneric');

  const onPress = () => {
    if (suggested) {
      router.push({
        pathname: '/(tabs)/transit',
        params: {
          origin: suggested.origin,
          destination: suggested.destination,
        },
      });
      return;
    }
    router.push('/(tabs)/transit');
  };

  return (
    <Card onPress={onPress} accessibilityLabel={title} style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.iconChip, { backgroundColor: withAlpha(accent, 0.12) }]}>
          <Bus size={iconSize.md} color={accent} />
        </View>
        <Text style={[typography.headline, { color: theme.onSurface, flex: 1 }]} numberOfLines={1}>
          {title}
        </Text>
        <ChevronRight size={iconSize.md} color={theme.onSurfaceMuted} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
