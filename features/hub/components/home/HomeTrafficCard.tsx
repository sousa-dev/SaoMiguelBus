import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
import { SaoMiguelMiniMap } from '@/features/hub/components/previews/SaoMiguelMiniMap';
import type { HomeData } from '@/features/hub/hooks/useHomeData';
import { withAlpha } from '@/lib/color-utils';
import { countTrafficReportsInWindow } from '@/lib/live-alerts';
import { getModule } from '@/lib/modules';
import { iconSize, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

export function HomeTrafficCard({ data }: { data: HomeData['traffic'] }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const mod = getModule('traffic');
  const accent = mod?.accent ?? theme.warning;
  const Icon = mod?.Icon;
  const active = data.reports.filter((r) => r.status === 'active');
  const reportsLastDay = countTrafficReportsInWindow(data.reports);
  const points = active.map((r) => ({ latitude: r.latitude, longitude: r.longitude }));

  return (
    <Card onPress={() => router.push('/traffic')} accessibilityLabel={t('homeTrafficTitle')} style={styles.card}>
      <View style={styles.header}>
        {Icon ? (
          <View style={[styles.iconChip, { backgroundColor: withAlpha(accent, 0.12) }]}>
            <Icon size={iconSize.sm} color={accent} strokeWidth={2} />
          </View>
        ) : null}
        <Text style={[typography.label, { color: theme.onSurface }]} numberOfLines={1}>
          {t('homeTrafficTitle')}
        </Text>
      </View>
      <SaoMiguelMiniMap points={points} color={accent} height={72} />
      <View style={styles.footerBlock}>
        <Text style={[typography.caption, styles.footerLine, { color: theme.onSurfaceMuted }]}>
          {active.length > 0 ? t('hubTrafficPreviewCount', { count: active.length }) : t('homeTrafficCalm')}
        </Text>
        <Text style={[typography.caption, styles.footerLine, { color: theme.onSurfaceMuted }]}>
          {t('hubTrafficReportsLastDay', { count: reportsLastDay })}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, width: '100%' },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm },
  iconChip: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBlock: {
    flexShrink: 1,
    marginTop: space.xs,
    gap: 2,
  },
  footerLine: {
    flexShrink: 1,
  },
});
