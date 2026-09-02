import { BellOff, LocateFixed, X } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/IconButton';
import { TransitCollapsibleSection } from '@/features/transit/components/TransitCollapsibleSection';
import { useBusTracking } from '@/features/transit/hooks/useBusTracking';
import { useTrackLive } from '@/features/transit/hooks/useTrackLive';
import {
  applyLiveToJourney,
  journeyLiveFootnote,
  uniqueLiveTripIds,
} from '@/features/transit/lib/live-track';
import { trackSettingsOpened } from '@/lib/notifications/analytics';
import { useNotificationUiStore } from '@/lib/notifications/ui-store';
import { usePremium } from '@/lib/premium-store';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import { journeyPositionLabels, type JourneyTrackStatus } from '@/lib/bus-tracking';

export function ActiveTrackingSection() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const isPremium = usePremium();
  const { active, stopTracking } = useBusTracking();
  // Permission can be switched off outside the app at any time. The OS keeps the
  // scheduled alarms and simply stops showing them, with no callback — so the
  // foreground check in `useNotificationPermissionResume` is the only thing that
  // can tell the rider their armed journeys have gone quiet (05 §3.4).
  const permissionRevoked = useNotificationUiStore((s) => s.permissionRevoked);

  const now = new Date();
  const tripIds = useMemo(
    () => uniqueLiveTripIds(active, now),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `active` already re-derives on the 30s tick
    [active],
  );
  const { trips } = useTrackLive(tripIds);

  // Webapp parity: the active-tracking widget is premium-only.
  if (!isPremium || active.length === 0) {
    return null;
  }

  return (
    <TransitCollapsibleSection
      icon={<LocateFixed size={16} color={theme.onPrimary} />}
      iconBackground={theme.primary}
      title={t('transitActiveTracking')}
      subtitle={t('activeTrackingSubtitle')}
      countLabel={
        active.length === 1
          ? t('trackingCountSingular')
          : t('trackingCountPlural', { count: active.length })
      }
      countBackground={theme.successSurface}
      countColor={theme.success}
    >
      {active.map(({ track, journey }) => {
        const merged = applyLiveToJourney(journey, track, trips, now);
        // The relevant leg: whichever bus the rider is waiting for or riding
        // right now, per `legIndex`. Older pins from before the dataset
        // migration carry no `tripId` — the card stays non-interactive rather
        // than opening the wrong trip.
        const openTripId = track.legs[merged.legIndex]?.tripId;
        return (
          <Pressable
            key={track.id}
            onPress={
              openTripId
                ? () =>
                    router.push({
                      pathname: '/(tabs)/transit/[tripId]',
                      params: { tripId: String(openTripId) },
                    })
                : undefined
            }
            accessibilityRole={openTripId ? 'button' : undefined}
            style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
          >
            <View style={styles.header}>
              <Text style={[typography.headline, { color: theme.primary }]}>{track.routeNumber}</Text>
              <IconButton
                icon={X}
                variant="ghost"
                size="sm"
                color={theme.muted}
                accessibilityLabel={t('transitStopTrack')}
                // Nested Pressables don't need this on native (only the
                // innermost one becomes the touch responder), but on web a
                // click bubbles to the card's own handler unless stopped here.
                onPress={(e) => {
                  e.stopPropagation();
                  stopTracking(track.id);
                }}
              />
            </View>
            <Text style={[typography.body, { color: theme.text }]}>
              {track.origin} → {track.destination}
            </Text>
            {/* The alarms are NOT cancelled when permission goes away: re-granting
                restores delivery for everything still pending, and discarding the
                rider's setup over a toggle they may flip back in ten seconds would
                be its own bug (05 §3.4). */}
            {permissionRevoked && track.notify ? (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  trackSettingsOpened('revoked_warning');
                  void Linking.openSettings();
                }}
                accessibilityRole="button"
                style={styles.revokedRow}
              >
                <BellOff size={14} color={theme.warning} strokeWidth={2} />
                <Text style={[typography.caption, { color: theme.warning, flex: 1 }]}>
                  {t('notificationsRevokedWarning')}
                </Text>
                <Text style={[typography.caption, { color: theme.primary }]}>
                  {t('notificationsRevokedAction')}
                </Text>
              </Pressable>
            ) : null}
            {/* A countdown the rider never started needs to say where it came from. */}
            {track.auto ? (
              <Text style={[typography.caption, { color: theme.info, marginTop: space.xs }]}>
                {t('trackStartedFromPin')}
              </Text>
            ) : null}
            <Text style={[typography.caption, { color: theme.muted, marginTop: space.xs }]}>
              {t(merged.statusLabel.key, merged.statusLabel.params)} ·{' '}
              {t(merged.countdown.key, merged.countdown.params)}
            </Text>
            <TrackPosition journey={merged} />
            <LegStrip journey={merged} />
          </Pressable>
        );
      })}
    </TransitCollapsibleSection>
  );
}

/**
 * Where the bus actually is.
 *
 * `computeJourneyStatus` has always returned `currentStop`, `nextStop` and
 * `timeToNextStopMin`, and nothing rendered them: the widget said "En route ·
 * 24 min" and left the rider to work out which of a dozen stops that meant.
 *
 * The footnote is not boilerplate. Whenever no live bus could be attributed to
 * this leg, it stays the schedule disclaimer it has always been — a premium
 * widget naming a stop and a minute count reads exactly like one that has a
 * GPS fix unless it says so. Once `journey.live` is set, `journeyLiveFootnote`
 * replaces it with the real delay, so the two never contradict each other.
 */
function TrackPosition({ journey }: { journey: JourneyTrackStatus }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { primary, secondary } = journeyPositionLabels(journey);
  const footnote = journeyLiveFootnote(journey, new Date());
  const isLive = footnote.key !== 'trackPositionEstimated';

  return (
    <View style={styles.position}>
      <Text style={[typography.body, { color: theme.text }]}>
        {t(primary.key, primary.params)}
      </Text>
      {secondary ? (
        <Text style={[typography.caption, { color: theme.muted }]}>
          {t(secondary.key, secondary.params)}
        </Text>
      ) : null}
      <Text
        style={[
          typography.caption,
          { color: isLive ? theme.success : theme.muted, opacity: isLive ? 1 : 0.8 },
        ]}
      >
        {t(footnote.key, footnote.params)}
      </Text>
    </View>
  );
}

/**
 * One row per bus with the change spelled out between them (09 §3.4).
 *
 * A single bar across the whole itinerary would draw the wait at an interchange
 * as if the rider were still moving, which is exactly the state they most need to
 * see. A direct journey has one leg and reads as the old single bar.
 */
function LegStrip({ journey }: { journey: JourneyTrackStatus }) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  if (journey.legs.length === 0) {
    return null;
  }

  return (
    <View style={styles.strip}>
      {journey.legs.map((leg, index) => {
        // `transfers[i]` is the change made BEFORE leg i + 1, so leg i reads the
        // one at i - 1. A direct journey has none and this stays null throughout.
        const transfer = index > 0 ? (journey.transfers[index - 1] ?? null) : null;
        const isCurrent = leg.state === 'riding';
        const fill =
          leg.state === 'done' ? theme.success : isCurrent ? theme.primary : theme.border;
        return (
          <View key={`${leg.routeNumber}-${index}`}>
            {transfer ? (
              <Text
                style={[
                  typography.caption,
                  { color: transfer.tight ? theme.warning : theme.muted, marginBottom: space.xs },
                ]}
              >
                {t(
                  transfer.tight ? 'trackStatusTransferTightWait' : 'trackStatusTransferWait',
                  { minutes: transfer.waitMinutes, at: transfer.at },
                )}
              </Text>
            ) : null}
            <View style={styles.legRow}>
              <Text
                style={[
                  typography.caption,
                  styles.legRoute,
                  { color: isCurrent ? theme.primary : theme.muted },
                ]}
                numberOfLines={1}
              >
                {leg.routeNumber}
              </Text>
              <View style={[styles.barTrack, { backgroundColor: theme.border }]}>
                <View style={[styles.barFill, { width: `${leg.progress}%`, backgroundColor: fill }]} />
              </View>
              <Text
                style={[typography.caption, styles.legArrival, { color: theme.muted }]}
                numberOfLines={1}
              >
                {leg.destination} {leg.arrival}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  revokedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.xs,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: space.md,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  position: { marginTop: space.sm, gap: 2 },
  strip: { marginTop: space.sm, gap: space.xs },
  legRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  legRoute: { minWidth: 36 },
  legArrival: { flexShrink: 1, maxWidth: '45%', textAlign: 'right' },
  barTrack: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%' },
});
