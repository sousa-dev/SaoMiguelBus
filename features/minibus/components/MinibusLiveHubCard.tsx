import { Bus, Radio, WifiOff } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import { Skeleton } from '@/components/ui/Skeleton';

type MinibusLiveHubCardProps = {
  /** Whether the live feed is actually reachable right now (online + AVL up). */
  enabled: boolean;
  isOnline: boolean;
  onPress: () => void;
  /**
   * From the shared `live-counts` cache (`useLiveVehicleCounts` +
   * `resolveLiveCount`) -- this card makes no network call of its own.
   * `null`/`undefined` means no count is known yet.
   */
  vehicleCount?: number | null;
  /**
   * True while `useLiveVehicleCounts` hasn't resolved yet. Reserves the
   * subtitle row with a skeleton bar instead of leaving it empty, so the
   * card doesn't grow by a line once the count arrives.
   */
  isLoading?: boolean;
};

/**
 * The "Ao vivo" entry on the PDL MiniBus hub, sharing a row with the plan-route
 * link, whose chrome and 34pt icon it mirrors -- same shape as AzoresBus's
 * `AzoresbusLiveHubCard` on the transit tab, so the two hubs read as one
 * pattern.
 *
 * Always rendered and always tappable, even when the feed is down: a control
 * that vanishes or refuses to respond reads as a feature that was taken away.
 * Tapping through lands on the live screen, which explains the outage/offline
 * state itself (and keeps showing its own ad banner there). Only the caption
 * and greyed icon change here.
 *
 * Carries NO margin: the row sits inside the plan/live pairing, which supplies
 * its own gap.
 */
export function MinibusLiveHubCard({
  enabled,
  isOnline,
  onPress,
  vehicleCount,
  isLoading,
}: MinibusLiveHubCardProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  const subtitle =
    enabled && vehicleCount != null
      ? t('minibusLiveVehiclesCount', { count: vehicleCount })
      : !isOnline
        ? t('minibusLiveOfflineShort')
        : !enabled
          ? t('minibusLiveUnavailableShort')
          : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        enabled
          ? t('minibusLiveCta')
          : `${t('minibusLiveCta')}. ${isOnline ? t('minibusLiveUnavailableHint') : t('minibusLiveOfflineHint')}`
      }
      onPress={onPress}
    >
      <View
        style={[
          styles.row,
          { backgroundColor: theme.card, borderColor: theme.border },
          !enabled && styles.rowDisabled,
        ]}
      >
        <View style={[styles.icon, { backgroundColor: theme.accent }]}>
          {isOnline ? (
            <Radio size={18} color={theme.onAccent} strokeWidth={2} />
          ) : (
            <WifiOff size={18} color={theme.onAccent} strokeWidth={2} />
          )}
        </View>
        <View style={styles.textCol}>
          <Text style={[typography.label, { color: theme.text }]} numberOfLines={1}>
            {t('minibusLiveCta')}
          </Text>
          {isLoading && enabled ? (
            <View style={styles.subtitleRow}>
              <Skeleton height={12} width={70} />
            </View>
          ) : subtitle ? (
            <View style={styles.subtitleRow}>
              {enabled ? <Bus size={12} color={theme.muted} /> : null}
              <Text style={[typography.caption, { color: theme.muted }]} numberOfLines={1}>
                {subtitle}
              </Text>
            </View>
          ) : null}
        </View>
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
  rowDisabled: { opacity: 0.55 },
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
