import { MapPin, Pin } from 'lucide-react-native';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/IconButton';
import { NotifyBellButton } from '@/features/transit/components/NotifyBellButton';
import { NotifyBellNotice } from '@/features/transit/components/NotifyBellNotice';
import { useNotifyBell } from '@/features/transit/hooks/useNotifyBell';
import { usePremiumGate } from '@/features/premium/hooks/usePremiumGate';
import { useBusTracking } from '@/features/transit/hooks/useBusTracking';
import { useScheduleConfig } from '@/features/transit/hooks/useScheduleConfig';
import { canPin } from '@/features/transit/lib/schedule-config';
import { useProfileStore, type ActiveTrack } from '@/lib/profile-store';
import { space } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { TransitSearchResult } from '@/lib/types';

type Props = {
  trip: TransitSearchResult;
  searchDay: string;
  showPin?: boolean;
};

export function TrackButton({ trip, searchDay, showPin = true }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  // Scheduling a track against timetables that are not yet in force would fire
  // countdowns on the wrong days (03 §3).
  const { canTrackTrips } = useScheduleConfig();
  const { canStartMore, startFromTrip, stopTracking, pinFromTrip, isTrackingTrip } = useBusTracking();
  const { guardPremiumAction } = usePremiumGate();
  const active = useProfileStore((s) => s.tracking.active);
  const tracking = isTrackingTrip(trip.id, trip.origin, trip.destination);
  const matchesTrip = (a: ActiveTrack) =>
    a.origin === trip.origin &&
    a.destination === trip.destination &&
    (a.legs?.[0]?.tripId === trip.id || a.tripId === trip.id);
  const activeTrack = active.find(matchesTrip);
  const activeId = activeTrack?.id;

  const onTrack = () => {
    // Stopping an active track is always allowed; starting is premium-gated.
    if (tracking && activeId) {
      stopTracking(activeId);
      return;
    }
    void guardPremiumAction(() => {
      if (!canStartMore) {
        Alert.alert(t('transitTrackCapTitle'), t('transitTrackCapMessage'));
        return;
      }
      const ok = startFromTrip(trip, searchDay);
      if (!ok) {
        Alert.alert(t('transitTrackCapTitle'), t('transitTrackCapMessage'));
      }
    }, 'track_start');
  };

  const onPin = () => {
    void guardPremiumAction(() => {
      // Only the cap is worth interrupting for: re-pinning something already
      // saved is a no-op the rider does not need an alert about.
      if (pinFromTrip(trip, searchDay) === 'cap') {
        Alert.alert(t('transitPinCapTitle'), t('transitPinCapMessage'));
      }
    }, 'track_pin');
  };

  /**
   * The bell arms a specific journey, so it needs a track — and starting one is
   * the same premium action the track button performs. Returns null when the
   * cap refuses it, having already said so, exactly as `onTrack` does.
   */
  const ensureTrack = (): ActiveTrack | null => {
    const existing = useProfileStore.getState().tracking.active.find(matchesTrip);
    if (existing) {
      return existing;
    }
    if (!canStartMore || !startFromTrip(trip, searchDay)) {
      Alert.alert(t('transitTrackCapTitle'), t('transitTrackCapMessage'));
      return null;
    }
    // `startTracking` reports success, not the record it made — so the freshly
    // written store is where the id comes from.
    return useProfileStore.getState().tracking.active.find(matchesTrip) ?? null;
  };

  const notify = useNotifyBell({
    track: activeTrack,
    ensureTrack,
    // A single trip is one bus: there is no change, so the sheet hides that row.
    hasTransfers: false,
    source: 'notify_trip',
  });

  // Split gate (09 §2 Gap A). Tracking still stands down against a timetable that
  // is not in force — a countdown would fire on the wrong days — but pinning
  // schedules nothing, so the row survives the preview instead of disappearing
  // with it. The row itself renders whenever at least one action is available.
  const showTrack = canTrackTrips;
  const showPinAction = showPin && canPin();
  if (!showTrack && !showPinAction) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
      {showTrack ? (
        <IconButton
          icon={MapPin}
          variant={tracking ? 'filled' : 'tonal'}
          color={tracking ? theme.primary : theme.muted}
          accessibilityLabel={tracking ? t('transitStopTrack') : t('transitStartTrack')}
          onPress={onTrack}
        />
      ) : null}
      {showPinAction ? (
        <IconButton
          icon={Pin}
          variant="tonal"
          color={theme.accent}
          accessibilityLabel={t('transitPinRoute')}
          onPress={onPin}
        />
      ) : null}
      {/* The bell inherits the TRACKING gate, not the pinning one: an alarm is
          scheduled against a specific timetable, so it must stand down while the
          rider previews times that are not yet in force (02 §3.1). */}
      {showTrack ? <NotifyBellButton state={notify} /> : null}
      </View>
      {showTrack ? <NotifyBellNotice state={notify} track={activeTrack} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: space.sm, flexShrink: 1 },
  row: { flexDirection: 'row', gap: space.sm },
});
