import { useRouter } from 'expo-router';
import { Bus, ChevronRight } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
import { track } from '@/lib/analytics';
import { withAlpha } from '@/lib/color-utils';
import { getModule } from '@/lib/modules';
import { iconSize, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

/**
 * The transit tab's `MinibusTransitLink` card, mirrored: rendered on the
 * MiniBus hub, it points the other way — at the AzoresBus network — and wears
 * transit's green accent chip where the original wears MiniBus orange, so
 * each card carries the colour of the network it leads to.
 */
export function TransitMinibusLink() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const accent = getModule('transit')?.accent ?? '#218732';
  const title = t('transitMinibusLink');

  const onPress = () => {
    track('transit', 'engage', { action: 'open_from_minibus' });
    router.push('/transit');
  };

  return (
    <Card onPress={onPress} accessibilityLabel={title} style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.iconChip, { backgroundColor: withAlpha(accent, 0.12) }]}>
          <Bus size={iconSize.md} color={accent} />
        </View>
        <Text style={[typography.headline, { color: theme.onSurface, flex: 1 }]} numberOfLines={2}>
          {title}
        </Text>
        <ChevronRight size={iconSize.md} color={theme.onSurfaceMuted} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: space.sm, marginBottom: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
