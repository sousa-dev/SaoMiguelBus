import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Map as MapIcon, MapPin } from 'lucide-react-native';

import { MINIBUS_ACCENT } from '@/features/minibus/lib/moduleAccent';
import { onColorFor } from '@/lib/color-utils';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type MinibusNetworkMapLinkProps = {
  /** Total stops in the PDL MiniBus network. Omitted while still loading. */
  stopsCount?: number;
};

/**
 * Way into the browsable MiniBus network map (all stops + the line catalog),
 * sharing a row with the "Ao vivo" entry (`MinibusLiveHubCard`) — the same
 * 34pt-icon row shape as AzoresBus's `TransitMapLinks`/`AzoresbusLiveHubCard`
 * pairing on the transit tab, so the two hubs read as one pattern.
 *
 * The icon chip wears the MiniBus orange accent rather than the app-wide
 * green, which is the one deliberate visual difference from `TransitMapLinks`.
 *
 * Carries NO margin: the row sits inside the map/live pairing, which supplies
 * its own gap.
 */
export function MinibusNetworkMapLink({ stopsCount }: MinibusNetworkMapLinkProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push('/(tabs)/minibus/network')}
      accessibilityRole="button"
      style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      <View style={[styles.icon, { backgroundColor: MINIBUS_ACCENT }]}>
        <MapIcon size={18} color={onColorFor(MINIBUS_ACCENT)} strokeWidth={2} />
      </View>
      <View style={styles.textCol}>
        <Text style={[typography.label, { color: theme.text }]} numberOfLines={1}>
          {t('minibusNetworkMap')}
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
