import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Bus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { azoresbusFleetVehicleListSubtitle } from '@/features/azoresbus/lib/fleetVehicleListSubtitle';
import { trackLiveFleetBar } from '@/features/azoresbus/lib/live-analytics';
import {
  azoresbusVehicleColorHex,
  azoresbusVehicleLineCode,
  compareLineCodes,
} from '@/features/azoresbus/lib/vehicleLine';
import { liveFleetBarTitle } from '@/features/live-tracking/lib/liveFleetBarTitle';
import {
  LIVE_FLEET_BAR_COMPACT_MAX_HEIGHT,
  LIVE_FLEET_BAR_MAX_HEIGHT,
} from '@/features/live-tracking/lib/liveVehicleSheetLayout';
import { radius, space, typography } from '@/lib/tokens';
import type { AzoresbusVehicleSummary } from '@/lib/types';
import { useAppTheme } from '@/lib/theme';

type Props = {
  vehicles: AzoresbusVehicleSummary[];
  /** Empty means no filter is applied. */
  filteredLineCodes: string[];
  selectedVehicleId: string | null;
  onSelectVehicle: (vehicleId: string) => void;
};

const FLEET_BAR_KEYS = {
  title: 'azoresbusLiveFleetBarTitle',
  titleFiltered: 'azoresbusLiveFleetBarTitleFiltered',
};

export function AzoresbusLiveFleetBar({
  vehicles,
  filteredLineCodes,
  selectedVehicleId,
  onSelectVehicle,
}: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);

  // Collapse once a bus is focused: its sheet is the thing to read now, and a
  // full-height list would cover the map the sheet is describing.
  useEffect(() => {
    if (selectedVehicleId) {
      setExpanded(false);
    }
  }, [selectedVehicleId]);

  const sorted = useMemo(
    () =>
      [...vehicles].sort((a, b) => {
        const codeA = azoresbusVehicleLineCode(a);
        const codeB = azoresbusVehicleLineCode(b);
        // Unlabelled buses sink to the bottom rather than jumbling the numbers.
        if (codeA && codeB && codeA !== codeB) {
          return compareLineCodes(codeA, codeB);
        }
        if (Boolean(codeA) !== Boolean(codeB)) {
          return codeA ? -1 : 1;
        }
        return a.id.localeCompare(b.id);
      }),
    [vehicles],
  );

  // The title names a single line, but says only how many buses when several
  // are selected -- "Buses on Line 101, 110, 311 (7)" is not a heading.
  const title = liveFleetBarTitle(
    t,
    sorted.length,
    filteredLineCodes.length === 1 ? filteredLineCodes[0] : null,
    FLEET_BAR_KEYS,
  );

  return (
    <View style={[styles.wrap, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(
          expanded ? 'azoresbusLiveFleetBarCollapse' : 'azoresbusLiveFleetBarExpand',
        )}
        style={styles.header}
        onPress={() => {
          trackLiveFleetBar(expanded ? 'collapse' : 'expand');
          setExpanded((value) => !value);
        }}
      >
        <Text style={[typography.label, { color: theme.text, flex: 1 }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={[styles.chevron, { backgroundColor: theme.surfaceVariant }]}>
          {expanded ? (
            <ChevronDown size={16} color={theme.text} />
          ) : (
            <ChevronUp size={16} color={theme.text} />
          )}
        </View>
      </Pressable>

      {expanded ? (
        <ScrollView
          style={{
            maxHeight: selectedVehicleId
              ? LIVE_FLEET_BAR_COMPACT_MAX_HEIGHT
              : LIVE_FLEET_BAR_MAX_HEIGHT,
          }}
        >
          {sorted.map((vehicle) => {
            const code = azoresbusVehicleLineCode(vehicle);
            return (
              <Pressable
                key={vehicle.id}
                accessibilityRole="button"
                style={[
                  styles.row,
                  vehicle.id === selectedVehicleId
                    ? { backgroundColor: theme.surfaceVariant }
                    : null,
                ]}
                onPress={() => onSelectVehicle(vehicle.id)}
              >
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: azoresbusVehicleColorHex(vehicle) },
                  ]}
                >
                  <Bus size={12} color="#fff" strokeWidth={2.5} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={[typography.bodyStrong, { color: theme.text }]} numberOfLines={1}>
                    {code
                      ? t('azoresbusLiveFilterLine', { line: code })
                      : t('azoresbusLiveRouteUnknown')}
                  </Text>
                  <Text style={[typography.caption, { color: theme.muted }]} numberOfLines={1}>
                    {azoresbusFleetVehicleListSubtitle(vehicle, t)}
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
    paddingBottom: space.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  chevron: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, minWidth: 0 },
});
