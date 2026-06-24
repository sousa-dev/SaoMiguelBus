import { Bus, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { fleetVehicleListSubtitle } from '@/features/minibus/lib/fleetVehicleListSubtitle';
import {
  resolveLineForVehicle,
  vehicleLineColorHex,
} from '@/features/minibus/lib/vehicleColor';
import { MINIBUS_LIVE_FLEET_BAR_COMPACT_MAX_HEIGHT, MINIBUS_LIVE_FLEET_BAR_MAX_HEIGHT } from '@/features/minibus/lib/liveVehicleSheetLayout';
import { onColorFor } from '@/lib/color-utils';
import { elevation, radius, space, typography } from '@/lib/tokens';
import type { MinibusLine, MinibusVehicleDetail, MinibusVehicleSummary } from '@/lib/types';
import { useAppTheme } from '@/lib/theme';

type Props = {
  vehicles: MinibusVehicleSummary[];
  lines: MinibusLine[];
  vehicleDetailsById: Map<string, MinibusVehicleDetail>;
  selectedVehicleId: string | null;
  onVehiclePress: (vehicleId: string) => void;
  onClearVehicle: () => void;
  compact?: boolean;
};

function fleetSortKey(vehicle: MinibusVehicleSummary, lines: MinibusLine[]): string {
  const line = resolveLineForVehicle(vehicle, lines);
  return `${line?.code ?? 'Z'}-${vehicle.id}`;
}

export function MinibusLiveFleetBar({
  vehicles,
  lines,
  vehicleDetailsById,
  selectedVehicleId,
  onVehiclePress,
  onClearVehicle,
  compact = false,
}: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);

  const sorted = [...vehicles].sort((a, b) =>
    fleetSortKey(a, lines).localeCompare(fleetSortKey(b, lines)),
  );

  const selectedVehicle = selectedVehicleId
    ? sorted.find((vehicle) => vehicle.id === selectedVehicleId)
    : undefined;

  useEffect(() => {
    if (selectedVehicleId != null) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
  }, [selectedVehicleId]);

  const handleVehiclePress = (vehicleId: string) => {
    setExpanded(false);
    onVehiclePress(vehicleId);
  };

  const handleHeaderPress = () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    onClearVehicle();
    setExpanded(true);
  };

  const selectedLine = selectedVehicle ? resolveLineForVehicle(selectedVehicle, lines) : null;
  const selectedLabel = selectedLine?.code ?? selectedVehicle?.id;
  const selectedSubtitle =
    selectedVehicle != null
      ? fleetVehicleListSubtitle(
          selectedVehicle,
          vehicleDetailsById.get(selectedVehicle.id),
          t,
        )
      : null;

  return (
    <View
      style={[
        styles.wrap,
        elevation(2, '#000'),
        { backgroundColor: theme.surface, borderTopColor: theme.border },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={
          expanded ? t('minibusLiveFleetBarCollapse') : t('minibusLiveFleetBarExpand')
        }
        onPress={handleHeaderPress}
        style={({ pressed }) => [
          styles.header,
          compact && styles.headerCompact,
          { opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <View
          style={[
            styles.headerChevronWrap,
            compact && styles.headerChevronWrapCompact,
            { backgroundColor: theme.surfaceVariant },
          ]}
        >
          {expanded ? (
            <ChevronDown size={compact ? 16 : 18} color={theme.text} strokeWidth={2.5} />
          ) : (
            <ChevronUp size={compact ? 16 : 18} color={theme.text} strokeWidth={2.5} />
          )}
        </View>
        <View style={styles.headerText}>
          <Text style={[typography.caption, { color: theme.muted }]}>
            {t('minibusLiveFleetBarTitle', { count: sorted.length })}
          </Text>
          {!expanded && selectedVehicle && selectedLabel ? (
            <Text style={[typography.label, { color: theme.text }]} numberOfLines={1}>
              {t('minibusLiveFilterLine', { line: selectedLabel })}
              {selectedSubtitle ? ` · ${selectedSubtitle}` : ''}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {expanded && sorted.length === 0 ? (
        <Text style={[typography.caption, styles.empty, { color: theme.muted }]}>
          {t('minibusLiveEmpty')}
        </Text>
      ) : null}
      {expanded && sorted.length > 0 ? (
        <ScrollView
          style={[
            styles.list,
            { maxHeight: compact ? MINIBUS_LIVE_FLEET_BAR_COMPACT_MAX_HEIGHT : MINIBUS_LIVE_FLEET_BAR_MAX_HEIGHT },
          ]}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
        >
          {sorted.map((vehicle) => {
            const line = resolveLineForVehicle(vehicle, lines);
            const lineColor = vehicleLineColorHex(vehicle, lines);
            const selected = vehicle.id === selectedVehicleId;
            const label = line?.code ?? vehicle.id;
            const detail = vehicleDetailsById.get(vehicle.id);
            const subtitle = fleetVehicleListSubtitle(vehicle, detail, t);

            return (
              <Pressable
                key={vehicle.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={t('minibusLiveFleetBarItem', {
                  line: label,
                  stop: subtitle,
                })}
                onPress={() => handleVehiclePress(vehicle.id)}
                style={({ pressed }) => [
                  styles.row,
                  compact && styles.rowCompact,
                  {
                    backgroundColor: selected ? theme.surfaceVariant : theme.background,
                    borderColor: selected ? lineColor : theme.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={[styles.lineDot, compact && styles.lineDotCompact, { backgroundColor: lineColor }]}>
                  <Bus size={compact ? 12 : 14} color={onColorFor(lineColor)} strokeWidth={2.5} />
                </View>
                <View style={styles.rowText}>
                  <Text
                    style={[
                      typography.label,
                      { color: theme.text },
                      selected && { fontWeight: '800' },
                    ]}
                  >
                    {t('minibusLiveFilterLine', { line: label })}
                  </Text>
                  <Text style={[typography.caption, { color: theme.muted }]} numberOfLines={2}>
                    {subtitle}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: space.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    paddingBottom: space.xs,
  },
  headerCompact: {
    paddingTop: space.xs,
    paddingBottom: 2,
    gap: space.xs,
  },
  headerChevronWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerChevronWrapCompact: {
    width: 28,
    height: 28,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  empty: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  list: {},
  listContent: {
    gap: space.xs,
    paddingHorizontal: space.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  rowCompact: {
    paddingVertical: space.xs,
    gap: space.xs,
  },
  lineDot: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  lineDotCompact: {
    width: 26,
    height: 26,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
});
