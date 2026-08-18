/**
 * Pin and track a WHOLE itinerary (09 §2 Gap B, §3.4).
 *
 * `TrackButton` acts on one `TransitSearchResult`, which is one bus. That was the
 * whole story on legacy São Miguel, where useful transfers barely existed, and it
 * is close to useless on AzoresBus: pinning half a two-bus journey gets the rider
 * the 110 back and leaves them to re-derive the change onto the 205 themselves.
 *
 * This is the card-level counterpart. It belongs in the journey card's own action
 * row, not inside a leg panel — a per-leg button next to it would be a duplicate
 * on a direct journey, which is why `hasMultipleRideLegs` exists.
 */

import { MapPin, Pin } from 'lucide-react-native';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/IconButton';
import { usePremiumGate } from '@/features/premium/hooks/usePremiumGate';
import { useBusTracking } from '@/features/transit/hooks/useBusTracking';
import { useScheduleConfig } from '@/features/transit/hooks/useScheduleConfig';
import { canPin } from '@/features/transit/lib/schedule-config';
import { space } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { TransitJourney } from '@/lib/types';

type Props = {
  journey: TransitJourney;
  searchDay: string;
  showPin?: boolean;
};

export function JourneyTrackButton({ journey, searchDay, showPin = true }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  // Same split gate as TrackButton: tracking stands down against a timetable
  // that is not in force, pinning does not.
  const { canTrackTrips } = useScheduleConfig();
  const {
    canStartMore,
    startFromJourney,
    stopTracking,
    pinFromJourney,
    unpinRoute,
    isTrackingJourney,
    isPinnedJourney,
    activeJourneyId,
    pinned,
  } = useBusTracking();
  const { guardPremiumAction } = usePremiumGate();

  const tracking = isTrackingJourney(journey.id);
  const isPinned = isPinnedJourney(journey.id);
  const trackId = activeJourneyId(journey.id);

  const onTrack = () => {
    // Stopping an active track is always allowed; starting is premium-gated.
    if (tracking && trackId) {
      stopTracking(trackId);
      return;
    }
    void guardPremiumAction(() => {
      if (!canStartMore) {
        Alert.alert(t('transitTrackCapTitle'), t('transitTrackCapMessage'));
        return;
      }
      if (!startFromJourney(journey, searchDay)) {
        Alert.alert(t('transitTrackCapTitle'), t('transitTrackCapMessage'));
      }
    }, 'track_start');
  };

  const onPin = () => {
    if (isPinned) {
      const existing = pinned.find((p) => p.journeyId === journey.id);
      if (existing) {
        unpinRoute(existing.id);
      }
      return;
    }
    void guardPremiumAction(() => {
      if (!pinFromJourney(journey, searchDay)) {
        // The only non-duplicate reason to fail is the cap (09 §3.2).
        Alert.alert(t('transitPinCapTitle'), t('transitPinCapMessage'));
      }
    }, 'track_pin');
  };

  const showTrack = canTrackTrips;
  const showPinAction = showPin && canPin();
  if (!showTrack && !showPinAction) {
    return null;
  }

  return (
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
          variant={isPinned ? 'filled' : 'tonal'}
          color={theme.accent}
          accessibilityLabel={isPinned ? t('transitUnpinRoute') : t('transitPinRoute')}
          onPress={onPin}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
});
