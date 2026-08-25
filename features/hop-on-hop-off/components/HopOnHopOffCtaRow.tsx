import { Binoculars, ChevronRight } from 'lucide-react-native';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import type { HopOnOffSource } from '@/features/hop-on-hop-off/lib/analytics';
import { trackHopOnOffSheetOpen } from '@/features/hop-on-hop-off/lib/analytics';
import { useHopOnOffModalStore } from '@/features/hop-on-hop-off/lib/modal-store';
import { HOP_ON_OFF_ACCENT } from '@/features/hop-on-hop-off/lib/theme';
import { withAlpha } from '@/lib/color-utils';
import { iconSize, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  source: HopOnOffSource;
  style?: StyleProp<ViewStyle>;
};

export function HopOnHopOffCtaRow({ source, style }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const openSheet = useHopOnOffModalStore((s) => s.openHopOnHopOffSheet);
  const accent = HOP_ON_OFF_ACCENT;
  const title = t('hopOnOffCtaTitle');
  const subtitle = t('hopOnOffCtaSubtitle');
  const badge = t('hopOnOffBadge');
  const accessibilityLabel = `${title}, ${subtitle}`;

  const onPress = () => {
    trackHopOnOffSheetOpen(source);
    openSheet(source);
  };

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      elevated={false}
      style={[
        styles.card,
        {
          borderColor: accent,
          backgroundColor: withAlpha(accent, 0.08),
        },
        style,
      ]}
    >
      <View style={styles.row}>
        <View style={[styles.iconChip, { backgroundColor: withAlpha(accent, 0.16) }]}>
          <Binoculars size={iconSize.md} color={accent} />
        </View>
        <View style={styles.textCol}>
          <View style={styles.titleRow}>
            <Text style={[typography.headline, styles.title, { color: theme.onSurface }]} numberOfLines={2}>
              {title}
            </Text>
            <Badge label={badge} tone="accent" size="compact" />
          </View>
          <Text style={[typography.caption, { color: theme.onSurfaceMuted }]} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
        <ChevronRight size={iconSize.md} color={theme.onSurfaceMuted} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 2,
    marginTop: space.sm,
    marginBottom: space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1, minWidth: 0, gap: space.xs },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  title: { flexShrink: 1 },
});
