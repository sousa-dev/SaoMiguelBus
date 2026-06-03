import { useRouter } from 'expo-router';
import { Activity } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
import { AzoresMiniMap } from '@/features/hub/components/previews/AzoresMiniMap';
import type { HomeData } from '@/features/hub/hooks/useHomeData';
import { withAlpha } from '@/lib/color-utils';
import { getModule } from '@/lib/modules';
import { iconSize, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

export function HomeEarthquakesCard({ data }: { data: HomeData['seismic'] }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const accent = getModule('seismic')?.accent ?? theme.danger;
  const events = data.events;
  const points = events.map((e) => ({ latitude: e.latitude, longitude: e.longitude }));
  const magnitudes = events.map((e) => e.magnitude);

  return (
    <Card
      onPress={() => router.push('/earthquakes')}
      accessibilityLabel={t('homeEarthquakesTitle')}
      style={styles.card}
    >
      <View style={styles.header}>
        <View style={[styles.iconChip, { backgroundColor: withAlpha(accent, 0.12) }]}>
          <Activity size={iconSize.sm} color={accent} />
        </View>
        <Text style={[typography.label, { color: theme.onSurface }]} numberOfLines={1}>
          {t('homeEarthquakesTitle')}
        </Text>
      </View>
      <AzoresMiniMap points={points} magnitudes={magnitudes} height={72} />
      <Text style={[typography.caption, styles.footer, { color: theme.onSurfaceMuted }]}>
        {events.length > 0 ? t('hubSeismicPreviewCount', { count: events.length }) : t('hubSeismicCalm')}
      </Text>
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
  footer: {
    flexShrink: 1,
    marginTop: space.xs,
  },
});
