import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MapPin, Route } from 'lucide-react-native';

import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type MinibusPlanRouteLinkProps = {
  onPress: () => void;
  /** Total stops in the PDL MiniBus network. Omitted while still loading. */
  stopsCount?: number;
};

/**
 * Way into the PDL MiniBus route planner, sharing a row with the "Ao vivo"
 * entry (`MinibusLiveHubCard`) -- same 34pt-icon row shape as AzoresBus's
 * `TransitMapLinks`/`AzoresbusLiveHubCard` pairing on the transit tab, so the
 * two hubs read as one pattern.
 *
 * Carries NO margin: the row sits inside the plan/live pairing, which supplies
 * its own gap.
 */
export function MinibusPlanRouteLink({ onPress, stopsCount }: MinibusPlanRouteLinkProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      <View style={[styles.icon, { backgroundColor: theme.primary }]}>
        <Route size={18} color={theme.onPrimary} strokeWidth={2} />
      </View>
      <View style={styles.textCol}>
        <Text style={[typography.label, { color: theme.text }]} numberOfLines={1}>
          {t('minibusPlanRoute')}
        </Text>
        {stopsCount ? (
          <View style={styles.subtitleRow}>
            <MapPin size={12} color={theme.muted} />
            <Text style={[typography.caption, { color: theme.muted }]} numberOfLines={1}>
              {t('minibusStopsCount', { count: stopsCount })}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1, gap: space.xs / 2 },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
});
