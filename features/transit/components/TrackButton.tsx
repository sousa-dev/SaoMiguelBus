import { MapPin, Pin } from 'lucide-react-native';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/IconButton';
import { usePremiumGate } from '@/features/premium/hooks/usePremiumGate';
import { useBusTracking } from '@/features/transit/hooks/useBusTracking';
import { useProfileStore } from '@/lib/profile-store';
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
  const { canStartMore, startFromTrip, stopTracking, pinFromTrip, isTrackingTrip } = useBusTracking();
  const { guardPremiumAction } = usePremiumGate();
  const active = useProfileStore((s) => s.tracking.active);
  const tracking = isTrackingTrip(trip.id, trip.origin, trip.destination);
  const activeId = active.find(
    (a) => a.tripId === trip.id && a.origin === trip.origin && a.destination === trip.destination,
  )?.id;

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
    void guardPremiumAction(() => pinFromTrip(trip, searchDay), 'track_pin');
  };

  return (
    <View style={styles.row}>
      <IconButton
        icon={MapPin}
        variant={tracking ? 'filled' : 'tonal'}
        color={tracking ? theme.primary : theme.muted}
        accessibilityLabel={tracking ? t('transitStopTrack') : t('transitStartTrack')}
        onPress={onTrack}
      />
      {showPin ? (
        <IconButton
          icon={Pin}
          variant="tonal"
          color={theme.accent}
          accessibilityLabel={t('transitPinRoute')}
          onPress={onPin}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
});
