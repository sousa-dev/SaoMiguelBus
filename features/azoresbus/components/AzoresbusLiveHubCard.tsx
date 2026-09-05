import { Bus, Radio, WifiOff } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import { Skeleton } from '@/components/ui/Skeleton';

type AzoresbusLiveHubCardProps = {
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
 * The "Ao vivo" entry on the transit tab, sharing a row with the network-map
 * link (`TransitMapLinks`), whose chrome and 34pt icon it mirrors so the two
 * halves sit at the same height.
 *
 * Always rendered and always tappable, even when the feed is down: a control
 * that vanishes or refuses to respond reads as a feature that was taken away.
 * Tapping through lands on the live screen, which explains the outage/offline
 * state itself (and keeps showing its own ad banner there). Only the caption
 * and greyed icon change here.
 *
 * Carries NO margin: the row sits inside `TransitWebShell`, whose column
 * already supplies `gap: space.md`.
 */
export function AzoresbusLiveHubCard({
  enabled,
  isOnline,
  onPress,
  vehicleCount,
  isLoading,
}: AzoresbusLiveHubCardProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  const subtitle =
    enabled && vehicleCount != null
      ? t('azoresbusLiveVehiclesCount', { count: vehicleCount })
      : !isOnline
        ? t('azoresbusLiveOfflineShort')
        : !enabled
          ? t('azoresbusLiveUnavailableShort')
          : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        enabled
          ? `${t('azoresbusLiveCta')}. ${t('azoresbusLiveCtaHint')}`
          : `${t('azoresbusLiveCta')}. ${isOnline ? t('azoresbusLiveUnavailableHint') : t('azoresbusLiveOfflineHint')}`
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
            {t('azoresbusLiveCta')}
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
