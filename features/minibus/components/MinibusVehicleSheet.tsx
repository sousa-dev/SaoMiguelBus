import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Sheet } from '@/components/ui/Sheet';
import { formatCirculationRows } from '@/features/minibus/lib/liveEtas';
import { buildTrackingFreshnessLabels } from '@/features/minibus/lib/trackingFreshness';
import { formatVehicleStatusLabel } from '@/features/minibus/lib/vehicleStatus';
import { resolveLineForVehicle } from '@/features/minibus/lib/vehicleColor';
import { onColorFor } from '@/lib/color-utils';
import { radius, space, typography } from '@/lib/tokens';
import type {
  MinibusLine,
  MinibusTrackingMeta,
  MinibusVehicleDetail,
} from '@/lib/types';
import { useAppTheme } from '@/lib/theme';

type Props = {
  visible: boolean;
  vehicle: MinibusVehicleDetail | null;
  lines: MinibusLine[];
  trackingMeta?: MinibusTrackingMeta | null;
  onClose: () => void;
};

export function MinibusVehicleSheet({ visible, vehicle, lines, trackingMeta, onClose }: Props) {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();

  if (!vehicle) {
    return null;
  }

  const line = resolveLineForVehicle(vehicle, lines);
  const lineColor = line?.color ?? (vehicle.color ? `#${vehicle.color.replace(/^#/, '')}` : theme.primary);
  const rows = formatCirculationRows(
    vehicle.journey?.circulations,
    vehicle.currentStopSequence,
    {
      now: t('minibusLiveEtaNow'),
      minutes: (count) => t('minibusLiveEtaMinutes', { count }),
    },
  );

  const freshnessLabels = buildTrackingFreshnessLabels(
    trackingMeta,
    {
      intervalSeconds: (count) => t('minibusLiveUpdateIntervalSeconds', { count }),
      intervalMinutes: (count) => t('minibusLiveUpdateIntervalMinutes', { count }),
    },
    i18n.language,
  );

  const title = line
    ? t('minibusLiveVehicleTitle', { line: line.code })
    : t('minibusLiveVehicleTitleUnknown');
  const statusLabel = formatVehicleStatusLabel(vehicle.status, t);

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View style={styles.headerMeta}>
        {line ? (
          <View style={[styles.lineBadge, { backgroundColor: lineColor }]}>
            <Text style={[typography.label, { color: onColorFor(lineColor) }]}>{line.code}</Text>
          </View>
        ) : null}
        <Text style={[typography.caption, { color: theme.muted }]}>{statusLabel}</Text>
        {vehicle.fleetId ? (
          <Text style={[typography.caption, { color: theme.muted }]}>
            {t('minibusLiveFleetId', { id: vehicle.fleetId })}
          </Text>
        ) : null}
      </View>

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
          {freshnessLabels?.updatedAtTime ? (
            <Text style={[typography.caption, { color: theme.muted }]}>
              {t('minibusLiveLastUpdated', { time: freshnessLabels.updatedAtTime })}
            </Text>
          ) : null}
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
    </Sheet>
  );
}

const styles = StyleSheet.create({
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    marginBottom: space.md,
  },
  lineBadge: {
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
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
});
