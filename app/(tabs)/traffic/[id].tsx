import { useMemo, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Clock, Navigation } from 'lucide-react-native';
import { Marker } from 'react-native-maps';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { OsmMapView } from '@/components/OsmMapView';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState, LoadingState } from '@/components/ui/StateView';
import {
  useConfirmTrafficReport,
  useDeleteTrafficReport,
  useTrafficReport,
} from '@/features/traffic/hooks/useTrafficQueries';
import { formatAppDateTime } from '@/lib/date-format';
import { coordinateToRegion } from '@/lib/island-map';
import { trafficCategoryIcon } from '@/lib/traffic-icons';
import { iconSize, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import { useFabActions } from '@/lib/fab-store';
import { useTrafficStore } from '@/lib/traffic-store';

export default function TrafficDetailScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const reportId = Number(params.id);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const report = useTrafficReport(reportId);
  const confirm = useConfirmTrafficReport(reportId);
  const remove = useDeleteTrafficReport();
  const isMine = useTrafficStore((s) => s.isMine(reportId));
  const removeFromStore = useTrafficStore((s) => s.removeReport);

  const fabActions = useMemo(() => {
    const r = report.data;
    if (!r) {
      return [];
    }
    return [
      {
        key: 'directions',
        labelKey: 'fabDirections',
        icon: Navigation,
        onPress: () =>
          void Linking.openURL(`https://www.google.com/maps?q=${r.latitude},${r.longitude}`),
      },
    ];
  }, [report.data]);

  useFabActions(fabActions);

  const runDelete = async () => {
    await remove.mutateAsync(reportId);
    removeFromStore(reportId);
    router.back();
  };

  if (report.isLoading) {
    return (
      <Screen withStackHeader>
        <LoadingState />
      </Screen>
    );
  }

  if (report.isError || !report.data) {
    return (
      <Screen withStackHeader>
        <ErrorState title={t('trafficLoadError')} />
      </Screen>
    );
  }

  const r = report.data;
  const Icon = trafficCategoryIcon(r.category.slug);
  const statusTone = r.status === 'active' ? 'primary' : r.status === 'scheduled' ? 'accent' : 'neutral';

  return (
    <Screen withStackHeader>
      <ScrollView contentContainerStyle={styles.content}>
        <Card elevated>
          <View style={styles.headerRow}>
            <Icon size={iconSize.xl} color={theme.primary} strokeWidth={2} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.headline, { color: theme.text }]}>{r.category.name}</Text>
              <View style={styles.badges}>
                <Badge label={r.status} tone={statusTone} />
                {r.status === 'scheduled' ? <Badge label={t('trafficScheduledBadge')} tone="accent" /> : null}
              </View>
            </View>
          </View>
          <View style={styles.meta}>
            <Clock size={iconSize.sm} color={theme.muted} />
            <Text style={[typography.caption, { color: theme.muted }]}>
              {formatAppDateTime(r.createdAt)}
            </Text>
          </View>
          {r.road ? <Text style={[typography.body, { color: theme.text, marginTop: space.md }]}>{r.road}</Text> : null}
          {r.description ? (
            <Text style={[typography.body, { color: theme.text, marginTop: space.sm, lineHeight: 22 }]}>
              {r.description}
            </Text>
          ) : null}
        </Card>

        {Platform.OS !== 'web' ? (
          <Card elevated style={styles.mapCard}>
            <OsmMapView
              style={styles.map}
              scrollEnabled={false}
              initialRegion={coordinateToRegion({ lat: r.latitude, lng: r.longitude })}
            >
              <Marker coordinate={{ latitude: r.latitude, longitude: r.longitude }} />
            </OsmMapView>
            <Button
              label={t('marketplaceContactDirections')}
              variant="outline"
              onPress={() => Linking.openURL(`https://www.google.com/maps?q=${r.latitude},${r.longitude}`)}
              fullWidth
              style={{ marginTop: space.md }}
            />
          </Card>
        ) : null}

        <Card>
          <Text style={[typography.caption, { color: theme.muted }]}>
            {t('trafficConfidence', { confirm: r.confidence.confirm, deny: r.confidence.deny })}
          </Text>
          <View style={styles.voteRow}>
            <Button
              label={t('trafficStillThere')}
              onPress={() => confirm.mutate('still_there')}
              disabled={confirm.isPending}
              style={{ flex: 1 }}
            />
            <Button
              label={t('trafficGone')}
              variant="outline"
              onPress={() => confirm.mutate('gone')}
              disabled={confirm.isPending}
              style={{ flex: 1 }}
            />
          </View>
        </Card>

        {isMine ? (
          confirmDelete ? (
            <Card>
              <Text style={[typography.body, { color: theme.muted }]}>{t('trafficDeleteConfirm')}</Text>
              <Button label={t('trafficDeleteAction')} variant="danger" onPress={() => void runDelete()} fullWidth style={{ marginTop: space.md }} />
              <Button label={t('trafficCancel')} variant="ghost" onPress={() => setConfirmDelete(false)} fullWidth />
            </Card>
          ) : (
            <Button label={t('trafficDeleteAction')} variant="danger" onPress={() => setConfirmDelete(true)} fullWidth />
          )
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space['4xl'], gap: space.md },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: space.sm },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.md },
  mapCard: { overflow: 'hidden' },
  map: { height: 160, borderRadius: 12 },
  voteRow: { flexDirection: 'row', gap: space.md, marginTop: space.md },
});
