import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Badge } from '@/components/ui/Badge';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
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
import {
  formatCirculationRows,
  stopDisplayNameFromCirculations,
  type MinibusLiveEtaRow,
} from '@/features/minibus/lib/liveEtas';
import {
  MINIBUS_LIVE_ETA_ROW_HEIGHT,
  MINIBUS_LIVE_VEHICLE_SHEET_HEIGHT_RATIO,
} from '@/features/minibus/lib/liveVehicleSheetLayout';
import { scrollTargetIndex } from '@/features/minibus/lib/liveVehicleSheetScroll';
import { MINIBUS_PUBLIC_TRACKING_URL } from '@/features/minibus/lib/trackingAttribution';
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

function ListSeparator() {
  return <View style={styles.listSeparator} />;
}

type Props = {
  visible: boolean;
  vehicle: MinibusVehicleDetail | null;
  lines: MinibusLine[];
  trackingMeta?: MinibusTrackingMeta | null;
  isFetching?: boolean;
  /** Renders as a bottom dock instead of a full-screen modal. */
  docked?: boolean;
  /** When docked, sit in layout flow below the map (not an absolute overlay). */
  inline?: boolean;
  compact?: boolean;
  highlightedStopSequence?: number | null;
  onStopPress?: (sequence: number) => void;
  onClose: () => void;
};

function EtaRow({
  row,
  theme,
  highlighted,
  compact = false,
  onPress,
}: {
  row: MinibusLiveEtaRow;
  theme: ReturnType<typeof useAppTheme>;
  highlighted: boolean;
  compact?: boolean;
  onPress?: (sequence: number) => void;
}) {
  const selected = highlighted || row.isCurrent;

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected }}
      onPress={onPress ? () => onPress(row.sequence) : undefined}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        compact && styles.rowCompact,
        selected && {
          backgroundColor: theme.surfaceVariant,
          borderRadius: radius.md,
        },
        pressed && onPress ? { opacity: 0.85 } : null,
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
      </View>
      <Text
        style={[
          typography.body,
          styles.eta,
          {
            color: selected ? theme.primary : theme.muted,
            fontWeight: selected ? '600' : '400',
          },
        ]}
        numberOfLines={1}
      >
        {row.etaLabel}
      </Text>
    </Pressable>
  );
}

export function MinibusVehicleSheet({
  visible,
  vehicle,
  lines,
  trackingMeta,
  isFetching = false,
  docked = false,
  inline = false,
  compact = false,
  highlightedStopSequence = null,
  onStopPress,
  onClose,
}: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const listRef = useRef<FlatList<MinibusLiveEtaRow>>(null);

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

  const targetIndex = useMemo(() => scrollTargetIndex(rows), [rows]);

  const scrollToCurrentStop = useCallback(
    (animated: boolean) => {
      if (targetIndex < 0 || !rows.length) {
        return;
      }
      listRef.current?.scrollToIndex({
        index: targetIndex,
        animated,
        viewPosition: 0,
      });
    },
    [rows.length, targetIndex],
  );

  useEffect(() => {
    if (!visible || targetIndex < 0) {
      return;
    }
    const timer = setTimeout(() => {
      scrollToCurrentStop(false);
    }, 120);
    return () => clearTimeout(timer);
  }, [scrollToCurrentStop, targetIndex, vehicle?.currentStopSequence, vehicle?.id, visible]);

  const handleScrollToIndexFailed = useCallback(
    (info: { index: number }) => {
      setTimeout(() => {
        listRef.current?.scrollToIndex({
          index: info.index,
          animated: false,
          viewPosition: 0,
        });
      }, 80);
    },
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: MinibusLiveEtaRow }) => (
      <EtaRow
        row={item}
        theme={theme}
        compact={compact}
        highlighted={highlightedStopSequence === item.sequence}
        onPress={onStopPress}
      />
    ),
    [compact, highlightedStopSequence, onStopPress, theme],
  );

  const listFooter = trackingMeta?.trackingAttribution ? (
    <View style={styles.footer}>
      <Text style={[typography.caption, { color: theme.muted }]}>
        {trackingMeta.trackingAttribution}
      </Text>
      <Pressable
        accessibilityRole="link"
        onPress={() => {
          void Linking.openURL(MINIBUS_PUBLIC_TRACKING_URL);
        }}
      >
        <Text style={[typography.caption, { color: theme.primary }]}>
          {t('minibusLiveAttributionLink')}
        </Text>
      </Pressable>
    </View>
  ) : null;

  const listMeta =
    vehicle && !compact ? (
      <View style={styles.listMeta}>
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
      </View>
    ) : null;

  const stopList = !vehicle ? (
    <View style={styles.loading}>
      <ActivityIndicator color={theme.primary} />
    </View>
  ) : (
    <FlatList
      ref={listRef}
      data={rows}
      keyExtractor={(item) => String(item.sequence)}
      renderItem={renderItem}
      style={styles.listScroll}
      contentContainerStyle={[
        styles.listContent,
        { paddingBottom: insets.bottom + space.lg },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator
      ListFooterComponent={listFooter}
      ListEmptyComponent={
        <Text style={[typography.body, styles.emptyList, { color: theme.muted }]}>
          {t('minibusLiveNoEtas')}
        </Text>
      }
      ItemSeparatorComponent={ListSeparator}
      onScrollToIndexFailed={handleScrollToIndexFailed}
      initialNumToRender={Math.max(12, targetIndex + 1)}
      getItemLayout={(_, index) => ({
        length: MINIBUS_LIVE_ETA_ROW_HEIGHT,
        offset: (MINIBUS_LIVE_ETA_ROW_HEIGHT + space.xs) * index,
        index,
      })}
    />
  );

  const stopListBody = (
    <>
      {listMeta}
      {stopList}
    </>
  );

  const stickyStatusBar =
    vehicle && statusLabel ? (
      <View
        style={[
          styles.stickyStatusBar,
          compact && styles.stickyStatusBarCompact,
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

  if (!visible) {
    return null;
  }

  if (docked) {
    const panelHeight = windowHeight * MINIBUS_LIVE_VEHICLE_SHEET_HEIGHT_RATIO;
    return (
      <View
        style={[
          styles.dockedPanel,
          inline ? styles.dockedPanelInline : styles.dockedPanelOverlay,
          elevation(3, '#000'),
          {
            height: panelHeight,
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
            paddingBottom: inline ? 0 : insets.bottom,
          },
        ]}
      >
        {!compact ? (
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: theme.outline }]} />
          </View>
        ) : null}
        <View style={[styles.titleRow, compact && styles.titleRowCompact]}>
          <Text
            style={[
              compact ? typography.bodyStrong : typography.headline,
              styles.titleText,
              { color: theme.text },
            ]}
          >
            {title}
          </Text>
          <IconButton icon={X} accessibilityLabel="Close" onPress={onClose} />
        </View>
        {stickyStatusBar}
        {stopListBody}
      </View>
    );
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={title} scrollable={false}>
      {stickyStatusBar}
      {stopListBody}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  dockedPanel: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
  },
  dockedPanelInline: {
    flexShrink: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dockedPanelOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
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
  titleRowCompact: {
    paddingHorizontal: space.md,
    marginBottom: space.xs,
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
  stickyStatusBarCompact: {
    paddingHorizontal: space.md,
    paddingBottom: space.xs,
  },
  stickyStatusText: {
    flex: 1,
    minWidth: 0,
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: space.lg,
  },
  listMeta: {
    paddingHorizontal: space.lg,
  },
  listSeparator: {
    height: space.xs,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.sm,
    marginBottom: space.sm,
  },
  lineBadge: {
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    flexShrink: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.sm,
    height: MINIBUS_LIVE_ETA_ROW_HEIGHT,
  },
  rowCompact: {
    paddingVertical: space.xs,
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
  emptyList: {
    paddingVertical: space.md,
  },
  footer: {
    paddingTop: space.lg,
    gap: space.xs,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.xl,
  },
});
