import { useRouter } from 'expo-router';
import { ChevronRight, Ticket } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
import { MINIBUS_ACCENT } from '@/features/minibus/lib/moduleAccent';
import { withAlpha } from '@/lib/color-utils';
import { iconSize, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

/**
 * Entry point to the MiniBus fare tables, modeled on the transit tab's
 * `TransitPricesLink`. The icon chip carries the MiniBus orange accent instead
 * of the app-wide green, so the two modules' cards stay distinguishable at a
 * glance while reading as the same control.
 */
export function MinibusPricesLink() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const title = t('minibusTariffs');

  return (
    <Card
      onPress={() => router.push('/(tabs)/minibus/prices')}
      accessibilityLabel={title}
      style={styles.card}
    >
      <View style={styles.row}>
        <View style={[styles.iconChip, { backgroundColor: withAlpha(MINIBUS_ACCENT, 0.12) }]}>
          <Ticket size={iconSize.md} color={MINIBUS_ACCENT} />
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
  card: { marginTop: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  iconChip: { padding: space.sm, borderRadius: space.sm },
});
