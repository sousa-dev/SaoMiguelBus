import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AzoresbusTrackingFreshness } from '@/features/azoresbus/components/AzoresbusTrackingFreshness';
import { azoresbusColorHex } from '@/features/azoresbus/lib/vehicleLine';
import { ChevronRight } from 'lucide-react-native';
import { radius, space, typography } from '@/lib/tokens';
import type { AzoresbusStopArrival } from '@/lib/types';
import { useAppTheme } from '@/lib/theme';

type Props = {
  arrivals: AzoresbusStopArrival[] | undefined;
  isLoading: boolean;
  isError: boolean;
  updatedAt?: number;
  isRefetching?: boolean;
  /** Given when a row should open the live map focused on that bus. */
  onSelectVehicle?: (vehicleId: string) => void;
};

/**
 * The live-arrivals list for one stop.
 *
 * Three empty-ish states that must not be collapsed into one: still loading,
 * the feed is unreachable, and genuinely nothing inbound. The last is the
 * common case after about 21:00 and is a real answer — telling a rider "we
 * can't reach the buses" when the truth is "there are none tonight" sends them
 * to wait at a stop for a bus that is not coming.
 */
export function AzoresbusStopArrivals({
  arrivals,
  isLoading,
  isError,
  updatedAt,
  isRefetching,
  onSelectVehicle,
}: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  if (isLoading) {
    // Says what it is waiting for. The lookup re-reads each inbound bus
    // upstream and can take a few seconds; a bare spinner in a section of an
    // otherwise-loaded page reads as the whole page still loading, so the
    // rider waits instead of reading the timetable that is already there.
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={theme.primary} />
        <Text style={[typography.caption, { color: theme.muted }]}>
          {t('azoresbusLiveStopSearching')}
        </Text>
      </View>
    );
  }

  if (isError) {
    return (
      <Text style={[typography.caption, styles.state, { color: theme.muted }]}>
        {t('azoresbusLiveUnavailable')}
      </Text>
    );
  }

  if (!arrivals?.length) {
    return (
      <Text style={[typography.caption, styles.state, { color: theme.muted }]}>
        {t('azoresbusLiveStopNoArrivals')}
      </Text>
    );
  }

  return (
    <View>
      <AzoresbusTrackingFreshness updatedAt={updatedAt} isRefetching={isRefetching} />
      {arrivals.map((arrival) => {
        const Row = onSelectVehicle ? Pressable : View;
        return (
        <Row
          key={`${arrival.vehicleId}-${arrival.journeyId}`}
          style={styles.row}
          {...(onSelectVehicle
            ? {
                accessibilityRole: 'button' as const,
                accessibilityLabel: `${arrival.lineCode} ${arrival.lineName}`,
                onPress: () => onSelectVehicle(arrival.vehicleId),
              }
            : {})}
        >
          <View
            style={[
              styles.lineBadge,
              { backgroundColor: azoresbusColorHex(arrival.lineColor) },
            ]}
          >
            <Text style={styles.lineBadgeText} numberOfLines={1}>
              {arrival.lineCode || '—'}
            </Text>
          </View>
          <Text
            style={[typography.body, { color: theme.text, flex: 1 }]}
            numberOfLines={1}
          >
            {arrival.lineName || t('azoresbusLiveVehicleTitleUnknown')}
          </Text>
          <Text
            style={[
              typography.bodyStrong,
              { color: arrival.stale ? theme.muted : theme.text },
            ]}
          >
            {arrival.dueInMinutes <= 0
              ? t('azoresbusLiveEtaNow')
              : t(
                  // "~5 min" rather than "5 min" when we could not re-read the
                  // bus: the number is extrapolated, and saying so is cheap.
                  arrival.stale
                    ? 'azoresbusLiveEtaApproxMinutes'
                    : 'azoresbusLiveEtaMinutes',
                  { count: arrival.dueInMinutes },
                )}
          </Text>
          {onSelectVehicle ? (
            <ChevronRight size={14} color={theme.muted} strokeWidth={2} />
          ) : null}
        </Row>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  state: { paddingVertical: space.lg, textAlign: 'center' },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
  },
  lineBadge: {
    minWidth: 42,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  lineBadgeText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
