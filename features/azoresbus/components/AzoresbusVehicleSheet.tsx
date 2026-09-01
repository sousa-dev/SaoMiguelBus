import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, X } from 'lucide-react-native';

import { AzoresbusTrackingFreshness } from '@/features/azoresbus/components/AzoresbusTrackingFreshness';
import { AZORESBUS_STATUS_KEYS } from '@/features/azoresbus/lib/fleetVehicleListSubtitle';
import { azoresbusVehicleColorHex } from '@/features/azoresbus/lib/vehicleLine';
import { formatCirculationRows } from '@/features/live-tracking/lib/liveEtas';
import { LIVE_ETA_ROW_HEIGHT } from '@/features/live-tracking/lib/liveVehicleSheetLayout';
import { formatVehicleStatusLabel } from '@/features/live-tracking/lib/vehicleStatus';
import { scrollTargetIndex } from '@/features/live-tracking/lib/liveVehicleSheetScroll';
import { radius, space, typography } from '@/lib/tokens';
import type { AzoresbusVehicleDetail } from '@/lib/types';
import { useAppTheme } from '@/lib/theme';

type Props = {
  vehicle: AzoresbusVehicleDetail | undefined;
  updatedAt?: number;
  isRefetching?: boolean;
  onClose: () => void;
  /** Given only for stops we could resolve to a real place. */
  onStopPress?: (stopId: number) => void;
};

export function AzoresbusVehicleSheet({
  vehicle,
  updatedAt,
  isRefetching,
  onClose,
  onStopPress,
}: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const listRef = useRef<FlatList>(null);

  const rows = useMemo(
    () =>
      formatCirculationRows(vehicle?.journey?.circulations, vehicle?.currentStopSequence, {
        now: t('azoresbusLiveEtaNow'),
        minutes: (count: number) => t('azoresbusLiveEtaMinutes', { count }),
        unavailable: '—',
      }),
    [t, vehicle?.currentStopSequence, vehicle?.journey?.circulations],
  );

  const initialIndex = useMemo(() => Math.max(scrollTargetIndex(rows), 0), [rows]);

  if (!vehicle) {
    return null;
  }

  const lineCode = vehicle.route?.nameShort?.trim();
  const accent = azoresbusVehicleColorHex(vehicle);
  const journeyWindow =
    vehicle.journey?.start && vehicle.journey?.end
      ? t('azoresbusLiveJourneyWindow', {
          start: vehicle.journey.start,
          end: vehicle.journey.end,
        })
      : null;

  return (
    <View style={[styles.wrap, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={[styles.lineBadge, { backgroundColor: accent }]}>
          <Text style={styles.lineBadgeText} numberOfLines={1}>
            {lineCode || '—'}
          </Text>
        </View>
        <View style={styles.headerBody}>
          <Text style={[typography.bodyStrong, { color: theme.text }]} numberOfLines={1}>
            {vehicle.route?.name?.trim() || t('azoresbusLiveVehicleTitleUnknown')}
          </Text>
          <Text style={[typography.caption, { color: theme.muted }]} numberOfLines={1}>
            {[
              formatVehicleStatusLabel(vehicle.status, t, { keys: AZORESBUS_STATUS_KEYS }),
              journeyWindow,
              vehicle.fleetId ? t('azoresbusLiveFleetId', { id: vehicle.fleetId }) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('close')}
          onPress={onClose}
          style={[styles.close, { backgroundColor: theme.surfaceVariant }]}
        >
          <X size={16} color={theme.text} />
        </Pressable>
      </View>

      <AzoresbusTrackingFreshness updatedAt={updatedAt} isRefetching={isRefetching} />

      {rows.length === 0 ? (
        <Text style={[typography.caption, styles.empty, { color: theme.muted }]}>
          {t('azoresbusLiveNoEtas')}
        </Text>
      ) : (
        <FlatList
          ref={listRef}
          data={rows}
          keyExtractor={(row) => String(row.sequence)}
          initialScrollIndex={initialIndex}
          // Fixed row height is what makes initialScrollIndex safe on a
          // 100-stop journey; without it the list cannot jump to the current
          // stop and throws onScrollToIndexFailed instead.
          getItemLayout={(_data, index) => ({
            length: LIVE_ETA_ROW_HEIGHT,
            offset: LIVE_ETA_ROW_HEIGHT * index,
            index,
          })}
          onScrollToIndexFailed={() => {
            // Non-fatal: the list simply starts at the top.
          }}
          renderItem={({ item }) => {
            // Only rows we could resolve lead anywhere; an unmatched stop stays
            // a plain readout rather than a control that does nothing.
            const tappable = onStopPress != null && item.stopId != null;
            const Row = tappable ? Pressable : View;
            return (
            <Row
              style={[styles.etaRow, { height: LIVE_ETA_ROW_HEIGHT }]}
              {...(tappable
                ? {
                    accessibilityRole: 'button' as const,
                    accessibilityLabel: `${item.stopName}. ${item.etaLabel}`,
                    onPress: () => onStopPress?.(item.stopId as number),
                  }
                : {})}
            >
              <View
                style={[
                  styles.etaDot,
                  {
                    backgroundColor: item.isCurrent ? accent : theme.outline,
                  },
                ]}
              />
              <Text
                style={[
                  item.isCurrent ? typography.bodyStrong : typography.body,
                  { color: item.isCurrent ? theme.text : theme.onSurfaceMuted, flex: 1 },
                ]}
                numberOfLines={1}
              >
                {item.stopName}
              </Text>
              <Text
                style={[
                  typography.caption,
                  { color: item.isCurrent ? theme.text : theme.muted },
                ]}
              >
                {item.etaLabel}
              </Text>
              {tappable ? (
                <ChevronRight size={14} color={theme.muted} strokeWidth={2} />
              ) : null}
            </Row>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    maxHeight: 300,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
  },
  headerBody: { flex: 1, minWidth: 0, gap: 2 },
  lineBadge: {
    minWidth: 42,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  lineBadgeText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  close: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { paddingHorizontal: space.md, paddingBottom: space.md },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
  },
  etaDot: { width: 8, height: 8, borderRadius: 4 },
});
