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
import { isWithinIslandBounds } from '@/lib/island-map';
import { track } from '@/lib/analytics';
import { useAppTheme } from '@/lib/theme';
import { useTrafficStore } from '@/lib/traffic-store';
import type { TrafficCategory, TrafficReport } from '@/lib/types';

const POLL_MS = 30000;

export default function TrafficScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const addReport = useTrafficStore((s) => s.addReport);

  const [focused, setFocused] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [scheduledOpen, setScheduledOpen] = useState(false);
  const [dismissedAlertId, setDismissedAlertId] = useState<number | null>(null);
  const [draftPin, setDraftPin] = useState<{ lat: number; lng: number } | null>(null);
  const [mapPickMode, setMapPickMode] = useState(false);

  const { coords, permission } = useNearbyLocation(focused);
  const userOnIsland = coords ? isWithinIslandBounds(coords.lat, coords.lng) : false;

  const categories = useTrafficCategories();
  const reports = useTrafficReports({
    lat: userOnIsland ? coords!.lat : undefined,
    lng: userOnIsland ? coords!.lng : undefined,
    radiusKm: userOnIsland ? 15 : undefined,
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

  const nearest = useProximityAlert(activeReports, userOnIsland ? coords : null);
  const showAlert = nearest && nearest.id !== dismissedAlertId ? nearest : null;

  const openReport = (report: TrafficReport) =>
    router.push({ pathname: '/(tabs)/traffic/[id]', params: { id: String(report.id) } });

  const openNewAtPin = (category?: string) => {
    const params: { category?: string; lat?: string; lng?: string } = {};
    if (category) {
      params.category = category;
    }
    if (draftPin) {
      params.lat = String(draftPin.lat);
      params.lng = String(draftPin.lng);
    }
    setPickerOpen(false);
    setMapPickMode(false);
    setDraftPin(null);
    router.push({ pathname: '/(tabs)/traffic/new', params });
  };

  const quickCreate = async (category: TrafficCategory) => {
    if (category.isSchedulable || draftPin) {
      openNewAtPin(category.slug);
      return;
    }
    if (!userOnIsland || !coords) {
      openNewAtPin(category.slug);
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

  const onMapPick = (picked: { lat: number; lng: number }) => {
    setDraftPin(picked);
    setMapPickMode(false);
    setPickerOpen(true);
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
    <Screen withStackHeader>
      <View style={styles.fill} pointerEvents="box-none">
        {hasMap ? (
          <TrafficMap
            reports={activeReports}
            userCoords={coords}
            draftPin={draftPin}
            pickMode={mapPickMode}
            theme={theme}
            onMarkerPress={openReport}
            onLongPress={onMapPick}
            onPickTap={onMapPick}
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

        {mapPickMode ? (
          <View style={[styles.pickBanner, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={{ color: theme.text, fontSize: 12, flex: 1 }}>{t('trafficMapPickModeHint')}</Text>
            <Pressable onPress={() => setMapPickMode(false)} hitSlop={8}>
              <Text style={{ color: theme.primary, fontWeight: '700' }}>{t('trafficCancel')}</Text>
            </Pressable>
          </View>
        ) : null}

        {draftPin && !pickerOpen ? (
          <View style={[styles.draftBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={{ color: theme.text, fontSize: 12, flex: 1 }}>{t('trafficDraftPinHint')}</Text>
            <Pressable
              onPress={() => setPickerOpen(true)}
              style={[styles.draftBtn, { backgroundColor: theme.primary }]}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{t('trafficReportTitle')}</Text>
            </Pressable>
            <Pressable onPress={() => setDraftPin(null)} hitSlop={8}>
              <Text style={{ color: theme.muted, fontWeight: '700' }}>✕</Text>
            </Pressable>
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
        onAddDetails={() => openNewAtPin()}
        onPickOnMap={() => {
          setPickerOpen(false);
          setMapPickMode(true);
        }}
        onClose={() => {
          setPickerOpen(false);
          setDraftPin(null);
        }}
      />

      <Modal
        visible={scheduledOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setScheduledOpen(false)}
      >
        <Pressable style={styles.scheduledBackdrop} onPress={() => setScheduledOpen(false)}>
          <Pressable
            style={[styles.scheduledSheet, { backgroundColor: theme.background }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{t('trafficScheduledTitle')}</Text>
              <Pressable onPress={() => setScheduledOpen(false)} hitSlop={8}>
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
          </Pressable>
        </Pressable>
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
  scheduledBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  scheduledSheet: {
    maxHeight: '78%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 8,
  },
  pickBanner: {
    position: 'absolute',
    top: 8,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    elevation: 3,
  },
  draftBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    elevation: 4,
  },
  draftBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
});
