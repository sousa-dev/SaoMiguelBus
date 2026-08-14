import { useRouter } from 'expo-router';
import { ChevronRight, Ticket } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
import { withAlpha } from '@/lib/color-utils';
import { iconSize, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

/** Entry point to the fare tables (03 §6). No price appears here. */
export function TransitPricesLink() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const title = t('transitPricesTitle');

  return (
    <Card
      onPress={() => router.push('/(tabs)/transit/prices')}
      accessibilityLabel={title}
      style={styles.card}
    >
      <View style={styles.row}>
        <View style={[styles.iconChip, { backgroundColor: withAlpha(theme.primary, 0.12) }]}>
          <Ticket size={iconSize.md} color={theme.primary} />
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
