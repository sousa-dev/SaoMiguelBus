import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Sheet } from '@/components/ui/Sheet';
import { formatCirculationRows } from '@/features/minibus/lib/liveEtas';
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
  const { t } = useTranslation();

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

  const title = line
    ? t('minibusLiveVehicleTitle', { line: line.code })
    : t('minibusLiveVehicleTitleUnknown');

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View style={styles.headerMeta}>
        {line ? (
          <View style={[styles.lineBadge, { backgroundColor: lineColor }]}>
            <Text style={[typography.label, { color: onColorFor(lineColor) }]}>{line.code}</Text>
          </View>
        ) : null}
        <Text style={[typography.caption, { color: theme.muted }]}>{vehicle.status}</Text>
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
              <Text style={[typography.caption, { color: theme.muted, width: 28 }]}>
                {row.sequence}
              </Text>
              <Text
                style={[
                  typography.body,
                  { color: theme.text, flex: 1 },
                  row.isCurrent && { fontWeight: '600' },
                ]}
                numberOfLines={2}
              >
                {row.stopName}
              </Text>
              <Text
                style={[
                  typography.body,
                  {
                    color: row.isCurrent ? theme.primary : theme.muted,
                    fontWeight: row.isCurrent ? '600' : '400',
                  },
                ]}
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
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.sm,
  },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    gap: space.xs,
  },
});
