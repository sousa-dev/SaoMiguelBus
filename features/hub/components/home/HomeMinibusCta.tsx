import { useRouter } from 'expo-router';
import { BusFront, ChevronRight } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
import { track } from '@/lib/analytics';
import { withAlpha } from '@/lib/color-utils';
import { getModule } from '@/lib/modules';
import { iconSize, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

export function HomeMinibusCta() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const accent = getModule('minibus')?.accent ?? '#f47216';
  const title = t('homeMinibusCtaTitle');

  const onPress = () => {
    track('minibus', 'engage', { action: 'open_from_hub' });
    router.push('/minibus');
  };

  return (
    <Card onPress={onPress} accessibilityLabel={title} style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.iconChip, { backgroundColor: withAlpha(accent, 0.12) }]}>
          <BusFront size={iconSize.md} color={accent} />
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
