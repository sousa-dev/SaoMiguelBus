import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Calendar, LocateFixed, Plus, X } from 'lucide-react-native';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Sheet } from '@/components/ui/Sheet';
import { iconSize, space, typography } from '@/lib/tokens';
import { CategoryPickerSheet } from '@/features/traffic/components/CategoryPickerSheet';
import { ProximityAlert } from '@/features/traffic/components/ProximityAlert';
import { ReportCard } from '@/features/traffic/components/ReportCard';
import { TrafficMap, type TrafficMapHandle } from '@/features/traffic/components/TrafficMap';
import {
  useTrafficCategories,
  useTrafficReports,
} from '@/features/traffic/hooks/useTrafficQueries';
import { useNearbyLocation } from '@/features/traffic/hooks/useNearbyLocation';
import { useProximityAlert } from '@/features/traffic/hooks/useProximityAlert';
import { isWithinIslandBounds } from '@/lib/island-map';
import { useFabActions } from '@/lib/fab-store';
import { track } from '@/lib/analytics';
import { useAppTheme } from '@/lib/theme';
import type { TrafficReport } from '@/lib/types';

const POLL_MS = 30000;

export default function TrafficScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const [focused, setFocused] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [scheduledOpen, setScheduledOpen] = useState(false);
  const [dismissedAlertId, setDismissedAlertId] = useState<number | null>(null);
  const [draftPin, setDraftPin] = useState<{ lat: number; lng: number } | null>(null);

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
    enabled: focused,
    refetchInterval: focused ? POLL_MS : undefined,
  });

  const mapRef = useRef<TrafficMapHandle>(null);

  useFabActions(
    useMemo(
      () => [
        {
          key: 'report-traffic',
          labelKey: 'trafficReportTitle',
          icon: Plus,
          onPress: () => setPickerOpen(true),
        },
        {
          key: 'center-on-me',
          labelKey: 'fabCenterOnMe',
          icon: LocateFixed,
          onPress: () => {
            if (userOnIsland && coords) {
              mapRef.current?.centerOn(coords);
            }
          },
        },
        {
          key: 'scheduled-events',
          labelKey: 'fabScheduledEvents',
          icon: Calendar,
          onPress: () => setScheduledOpen(true),
        },
      ],
      [coords, userOnIsland],
    ),
  );

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
  const scheduledCount = scheduledReports.length;

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
    setDraftPin(null);
    router.push({ pathname: '/(tabs)/traffic/new', params });
  };

  const onMapPick = (picked: { lat: number; lng: number }) => {
    setDraftPin(picked);
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
            ref={mapRef}
            reports={activeReports}
            userCoords={coords}
            draftPin={draftPin}
            theme={theme}
            onMarkerPress={openReport}
            onLongPress={onMapPick}
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
          accessibilityRole="button"
          accessibilityLabel={t('trafficScheduledA11y', { count: scheduledCount })}
          style={[styles.scheduledPill, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <Calendar size={iconSize.sm} color={theme.primary} strokeWidth={2} />
          <Text style={[typography.caption, { color: theme.text, fontWeight: '600' }]}>
            {t('trafficScheduledTitle')}
          </Text>
          {scheduledCount > 0 ? (
            <Badge label={String(scheduledCount)} tone="primary" />
          ) : null}
        </Pressable>

        {reports.isLoading ? (
          <ActivityIndicator color={theme.primary} style={styles.loader} />
        ) : null}

        {permission === 'denied' ? (
          <View style={[styles.permBanner, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={{ color: theme.muted, fontSize: 12 }}>{t('trafficLocationDenied')}</Text>
          </View>
        ) : null}

        {draftPin && !pickerOpen ? (
          <View style={[styles.draftBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={{ color: theme.text, fontSize: 12, flex: 1 }}>{t('trafficDraftPinHint')}</Text>
            <Button label={t('trafficReportTitle')} size="sm" onPress={() => setPickerOpen(true)} />
            <IconButton
              icon={X}
              variant="ghost"
              color={theme.muted}
              accessibilityLabel={t('trafficCancel')}
              onPress={() => setDraftPin(null)}
            />
          </View>
        ) : null}

      </View>

      <CategoryPickerSheet
        visible={pickerOpen}
        categories={categories.data ?? []}
        theme={theme}
        onPick={(c) => openNewAtPin(c.slug)}
        onClose={() => {
          setPickerOpen(false);
          setDraftPin(null);
        }}
      />

      <Sheet visible={scheduledOpen} onClose={() => setScheduledOpen(false)} title={t('trafficScheduledTitle')}>
        {scheduled.isLoading ? (
          <ActivityIndicator color={theme.primary} style={{ marginVertical: space['2xl'] }} />
        ) : null}
        {!scheduled.isLoading && scheduledReports.length === 0 ? (
          <Text style={[typography.body, { color: theme.muted, textAlign: 'center', marginTop: space['2xl'] }]}>
            {t('trafficScheduledEmpty')}
          </Text>
        ) : null}
        {scheduledReports.map((item) => (
          <ReportCard
            key={item.id}
            report={item}
            theme={theme}
            onPress={() => {
              setScheduledOpen(false);
              openReport(item);
            }}
          />
        ))}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  list: { padding: space.md, paddingBottom: space['2xl'] },
  loader: { position: 'absolute', top: 70, alignSelf: 'center' },
  scheduledPill: {
    position: 'absolute',
    left: 12,
    bottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
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
});
