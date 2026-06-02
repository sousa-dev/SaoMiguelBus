import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { CategoryPickerSheet } from '@/features/traffic/components/CategoryPickerSheet';
import { ProximityAlert } from '@/features/traffic/components/ProximityAlert';
import { QuickReportButton } from '@/features/traffic/components/QuickReportButton';
import { ReportCard } from '@/features/traffic/components/ReportCard';
import { TrafficMap } from '@/features/traffic/components/TrafficMap';
import {
  useCreateTrafficReport,
  useTrafficCategories,
  useTrafficReports,
} from '@/features/traffic/hooks/useTrafficQueries';
import { useNearbyLocation } from '@/features/traffic/hooks/useNearbyLocation';
import { useProximityAlert } from '@/features/traffic/hooks/useProximityAlert';
import { useBootstrap } from '@/features/transit/hooks/useTransitQueries';
import { track } from '@/lib/analytics';
import { staticIslandConfig } from '@/config/island';
import { useAppTheme } from '@/lib/theme';
import { useTrafficStore } from '@/lib/traffic-store';
import type { TrafficCategory, TrafficReport } from '@/lib/types';

const POLL_MS = 30000;

export default function TrafficScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const addReport = useTrafficStore((s) => s.addReport);

  const { data: bootstrap } = useBootstrap();
  const center = bootstrap?.island?.mapCenter ?? {
    lat: staticIslandConfig.mapCenter?.lat ?? 37.78,
    lng: staticIslandConfig.mapCenter?.lng ?? -25.5,
  };

  const [focused, setFocused] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [scheduledOpen, setScheduledOpen] = useState(false);
  const [dismissedAlertId, setDismissedAlertId] = useState<number | null>(null);

  const { coords, permission } = useNearbyLocation(focused);

  const categories = useTrafficCategories();
  const reports = useTrafficReports({
    lat: coords?.lat,
    lng: coords?.lng,
    radiusKm: coords ? 15 : undefined,
    enabled: focused,
    refetchInterval: focused ? POLL_MS : undefined,
  });
  const scheduled = useTrafficReports({
    includeScheduled: true,
    enabled: scheduledOpen,
  });

  const create = useCreateTrafficReport();

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      track('traffic', 'view', { screen: 'map' });
      return () => setFocused(false);
    }, []),
  );

  const activeReports = useMemo(
    () => (reports.data ?? []).filter((r) => r.status === 'active'),
    [reports.data],
  );
  const scheduledReports = useMemo(
    () => (scheduled.data ?? []).filter((r) => r.status === 'scheduled'),
    [scheduled.data],
  );

  const nearest = useProximityAlert(activeReports, coords ?? null);
  const showAlert = nearest && nearest.id !== dismissedAlertId ? nearest : null;

  const openReport = (report: TrafficReport) =>
    router.push({ pathname: '/(tabs)/traffic/[id]', params: { id: String(report.id) } });

  const quickCreate = async (category: TrafficCategory) => {
    if (!coords) {
      Alert.alert(t('trafficLocationNeeded'), t('trafficLocationNeededHint'));
      return;
    }
    if (category.isSchedulable) {
      setPickerOpen(false);
      router.push({ pathname: '/(tabs)/traffic/new', params: { category: category.slug } });
      return;
    }
    try {
      const report = await create.mutateAsync({
        category_slug: category.slug,
        latitude: coords.lat,
        longitude: coords.lng,
      });
      addReport(report.id);
      setPickerOpen(false);
    } catch {
      Alert.alert(t('trafficReportError'));
    }
  };

  const reportList = (
    <FlatList
      data={activeReports}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <ReportCard report={item} theme={theme} onPress={() => openReport(item)} />
      )}
      ListEmptyComponent={
        !reports.isLoading ? (
          <Text style={{ color: theme.muted, textAlign: 'center', marginTop: 24 }}>
            {t('trafficEmpty')}
          </Text>
        ) : null
      }
      contentContainerStyle={styles.list}
    />
  );

  const hasMap = Platform.OS !== 'web';

  return (
    <Screen withStackHeader edges={hasMap ? [] : ['bottom']}>
      <View style={styles.fill}>
        {hasMap ? (
          <TrafficMap
            reports={activeReports}
            center={center}
            userCoords={coords}
            theme={theme}
            onMarkerPress={openReport}
          />
        ) : (
          reportList
        )}

        {showAlert ? (
          <ProximityAlert
            report={showAlert}
            theme={theme}
            onPress={() => openReport(showAlert)}
            onDismiss={() => setDismissedAlertId(showAlert.id)}
          />
        ) : null}

        <Pressable
          onPress={() => setScheduledOpen(true)}
          style={[styles.scheduledPill, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600' }}>
            🗓 {t('trafficScheduledTitle')}
          </Text>
        </Pressable>

        {reports.isLoading ? (
          <ActivityIndicator color={theme.primary} style={styles.loader} />
        ) : null}

        {permission === 'denied' ? (
          <View style={[styles.permBanner, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={{ color: theme.muted, fontSize: 12 }}>{t('trafficLocationDenied')}</Text>
          </View>
        ) : null}

        <QuickReportButton theme={theme} onPress={() => setPickerOpen(true)} />
      </View>

      <CategoryPickerSheet
        visible={pickerOpen}
        categories={categories.data ?? []}
        theme={theme}
        pending={create.isPending}
        onPick={(c) => void quickCreate(c)}
        onAddDetails={() => {
          setPickerOpen(false);
          router.push('/(tabs)/traffic/new');
        }}
        onClose={() => setPickerOpen(false)}
      />

      <Modal visible={scheduledOpen} animationType="slide" onRequestClose={() => setScheduledOpen(false)}>
        <Screen edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t('trafficScheduledTitle')}</Text>
            <Pressable onPress={() => setScheduledOpen(false)}>
              <Text style={{ color: theme.primary, fontWeight: '700' }}>{t('trafficClose')}</Text>
            </Pressable>
          </View>
          <FlatList
            data={scheduledReports}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <ReportCard
                report={item}
                theme={theme}
                onPress={() => {
                  setScheduledOpen(false);
                  openReport(item);
                }}
              />
            )}
            ListEmptyComponent={
              !scheduled.isLoading ? (
                <Text style={{ color: theme.muted, textAlign: 'center', marginTop: 24 }}>
                  {t('trafficScheduledEmpty')}
                </Text>
              ) : null
            }
            contentContainerStyle={styles.list}
          />
        </Screen>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  list: { padding: 12, paddingBottom: 90 },
  loader: { position: 'absolute', top: 70, alignSelf: 'center' },
  scheduledPill: {
    position: 'absolute',
    left: 12,
    bottom: 28,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    elevation: 2,
  },
  permBanner: {
    position: 'absolute',
    bottom: 96,
    left: 12,
    right: 80,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800' },
});
