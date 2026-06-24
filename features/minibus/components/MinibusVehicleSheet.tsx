import { useEffect, useMemo, useRef } from 'react';
import { Badge } from '@/components/ui/Badge';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { Sheet } from '@/components/ui/Sheet';
import { IconButton } from '@/components/ui/IconButton';
import { MinibusTrackingFreshness } from '@/features/minibus/components/MinibusTrackingFreshness';
import { formatCirculationRows, stopDisplayNameFromCirculations } from '@/features/minibus/lib/liveEtas';
import {
  MINIBUS_LIVE_ETA_ROW_HEIGHT,
  MINIBUS_LIVE_VEHICLE_SHEET_HEIGHT_RATIO,
} from '@/features/minibus/lib/liveVehicleSheetLayout';
import { formatVehicleStatusLabel } from '@/features/minibus/lib/vehicleStatus';
import { resolveLineForVehicle } from '@/features/minibus/lib/vehicleColor';
import { onColorFor } from '@/lib/color-utils';
import { elevation, radius, sheet, space, typography } from '@/lib/tokens';
import type {
  MinibusLine,
  MinibusTrackingMeta,
  MinibusVehicleDetail,
} from '@/lib/types';
import { useAppTheme } from '@/lib/theme';

const ETA_UNAVAILABLE = '—';

type Props = {
  visible: boolean;
  vehicle: MinibusVehicleDetail | null;
  lines: MinibusLine[];
  trackingMeta?: MinibusTrackingMeta | null;
  isFetching?: boolean;
  /** Renders as a bottom dock over the map instead of a full-screen modal. */
  docked?: boolean;
  onClose: () => void;
};

function scrollTargetIndex(
  rows: ReturnType<typeof formatCirculationRows>,
  currentStopSequence: number | null | undefined,
): number {
  if (!rows.length) {
    return -1;
  }
  const currentIdx = rows.findIndex((row) => row.isCurrent);
  if (currentIdx >= 0) {
    return currentIdx;
  }
  if (currentStopSequence != null) {
    const nextIdx = rows.findIndex((row) => row.sequence > currentStopSequence);
    if (nextIdx >= 0) {
      return nextIdx;
    }
  }
  return 0;
}

export function MinibusVehicleSheet({
  visible,
  vehicle,
  lines,
  trackingMeta,
  isFetching = false,
  docked = false,
  onClose,
}: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const listScrollRef = useRef<ScrollView>(null);

  const line = vehicle ? resolveLineForVehicle(vehicle, lines) : null;
  const lineColor =
    line?.color ??
    (vehicle?.color ? `#${vehicle.color.replace(/^#/, '')}` : theme.primary);
  const rows = vehicle
    ? formatCirculationRows(vehicle.journey?.circulations, vehicle.currentStopSequence, {
        now: t('minibusLiveEtaNow'),
        minutes: (count) => t('minibusLiveEtaMinutes', { count }),
        unavailable: ETA_UNAVAILABLE,
      })
    : [];

  const title = line
    ? t('minibusLiveVehicleTitle', { line: line.code })
    : t('minibusLiveVehicleTitleUnknown');
  const statusLabel = vehicle
    ? formatVehicleStatusLabel(vehicle.status, t, {
        nextStopName: stopDisplayNameFromCirculations(
          vehicle.journey?.circulations,
          vehicle.currentStopSequence,
        ),
      })
    : null;

  const targetIndex = useMemo(
    () => scrollTargetIndex(rows, vehicle?.currentStopSequence),
    [rows, vehicle?.currentStopSequence],
  );

  useEffect(() => {
    if (!visible || targetIndex < 0) {
      return;
    }
    const timer = setTimeout(() => {
      listScrollRef.current?.scrollTo({
        y: Math.max(0, targetIndex * MINIBUS_LIVE_ETA_ROW_HEIGHT - MINIBUS_LIVE_ETA_ROW_HEIGHT),
        animated: true,
      });
    }, 120);
    return () => clearTimeout(timer);
  }, [visible, targetIndex, vehicle?.id, vehicle?.currentStopSequence]);

  if (!visible) {
    return null;
  }

  const body = !vehicle ? (
    <View style={styles.loading}>
      <ActivityIndicator color={theme.primary} />
    </View>
  ) : (
    <>
      <View style={styles.headerMeta}>
        {vehicle.fleetId ? (
          <Text style={[typography.caption, { color: theme.muted }]}>
            {t('minibusLiveFleetId', { id: vehicle.fleetId })}
          </Text>
        ) : null}
        {trackingMeta?.stale ? (
          <Badge label={t('minibusLiveStale')} tone="accent" size="compact" />
        ) : null}
      </View>

      <MinibusTrackingFreshness meta={trackingMeta} isFetching={isFetching} />

      <View style={styles.list}>
        {rows.length === 0 ? (
          <Text style={[typography.body, { color: theme.muted }]}>{t('minibusLiveNoEtas')}</Text>
        ) : (
          rows.map((row) => (
            <View
              key={row.sequence}
              style={[
                styles.row,
                row.isCurrent && {
                  backgroundColor: theme.surfaceVariant,
                  borderRadius: radius.md,
                },
              ]}
            >
              <Text style={[styles.sequence, typography.caption, { color: theme.muted }]}>
                {row.sequence}
              </Text>
              <View style={styles.stopLabel}>
                <Text
                  style={[
                    typography.body,
                    styles.stopName,
                    { color: theme.text },
                    row.isCurrent && { fontWeight: '600' },
                  ]}
                  numberOfLines={2}
                >
                  {row.stopName}
                </Text>
                {row.stopCode ? (
                  <Text style={[typography.caption, { color: theme.muted }]} numberOfLines={1}>
                    {row.stopCode}
                  </Text>
                ) : null}
              </View>
              <Text
                style={[
                  typography.body,
                  styles.eta,
                  {
                    color: row.isCurrent ? theme.primary : theme.muted,
                    fontWeight: row.isCurrent ? '600' : '400',
                  },
                ]}
                numberOfLines={1}
              >
                {row.etaLabel}
              </Text>
            </View>
          ))
        )}
      </View>

      {trackingMeta?.trackingAttribution ? (
        <View style={styles.footer}>
          <Text style={[typography.caption, { color: theme.muted }]}>
            {trackingMeta.trackingAttribution}
          </Text>
          {trackingMeta.trackingSourceUrl ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => {
                void Linking.openURL(trackingMeta.trackingSourceUrl);
              }}
            >
              <Text style={[typography.caption, { color: theme.primary }]}>
                {t('minibusLiveAttributionLink')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </>
  );

  const scrollBody = (
    <ScrollView
      ref={listScrollRef}
      style={styles.scrollArea}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: insets.bottom + space.lg }}
      showsVerticalScrollIndicator
    >
      {body}
    </ScrollView>
  );

  const stickyStatusBar =
    vehicle && statusLabel ? (
      <View
        style={[
          styles.stickyStatusBar,
          { backgroundColor: theme.surface, borderBottomColor: theme.border },
        ]}
      >
        {line ? (
          <View style={[styles.lineBadge, { backgroundColor: lineColor }]}>
            <Text style={[typography.label, { color: onColorFor(lineColor) }]}>{line.code}</Text>
          </View>
        ) : null}
        <Text
          style={[typography.bodyStrong, styles.stickyStatusText, { color: theme.text }]}
          numberOfLines={2}
        >
          {statusLabel}
        </Text>
      </View>
    ) : null;

  if (docked) {
    const panelHeight = windowHeight * MINIBUS_LIVE_VEHICLE_SHEET_HEIGHT_RATIO;
    return (
      <View
        style={[
          styles.dockedPanel,
          elevation(3, '#000'),
          {
            height: panelHeight,
            backgroundColor: theme.surface,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <View style={styles.handleWrap}>
          <View style={[styles.handle, { backgroundColor: theme.outline }]} />
        </View>
        <View style={styles.titleRow}>
          <Text style={[typography.headline, styles.titleText, { color: theme.text }]}>{title}</Text>
          <IconButton icon={X} accessibilityLabel="Close" onPress={onClose} />
        </View>
        {stickyStatusBar}
        {scrollBody}
      </View>
    );
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={title} scrollable={false}>
      {stickyStatusBar}
      {scrollBody}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  dockedPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
    zIndex: 20,
  },
  handleWrap: { alignItems: 'center', paddingVertical: space.sm },
  handle: { width: sheet.handleWidth, height: sheet.handleHeight, borderRadius: radius.full },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    marginBottom: space.sm,
    gap: space.sm,
  },
  titleText: {
    flex: 1,
  },
  stickyStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stickyStatusText: {
    flex: 1,
    minWidth: 0,
  },
  scrollArea: {
    flex: 1,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    marginTop: space.sm,
    marginBottom: space.sm,
  },
  lineBadge: {
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    flexShrink: 0,
  },
  list: {
    paddingHorizontal: space.lg,
    gap: space.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.sm,
    minHeight: MINIBUS_LIVE_ETA_ROW_HEIGHT,
  },
  sequence: {
    width: 28,
    flexShrink: 0,
    paddingTop: 2,
  },
  stopLabel: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 2,
  },
  stopName: {
    flexShrink: 1,
  },
  eta: {
    flexShrink: 0,
    minWidth: 52,
    textAlign: 'right',
    paddingTop: 2,
  },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    gap: space.xs,
  },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.xl,
  },
});
