import { Bus, ChevronDown, ChevronUp, Phone, ThumbsDown, ThumbsUp } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { RouteTimeline } from '@/features/transit/components/RouteTimeline';
import { ShareTripButton } from '@/features/transit/components/ShareTripButton';
import { TrackButton } from '@/features/transit/components/TrackButton';
import { SchedulePreviewChip } from '@/features/transit/components/SchedulePreviewNotice';
import { arrivesNextDay, resolveBoardingPole } from '@/features/transit/lib/boarding-pole';
import { useTripVote } from '@/features/transit/hooks/useTransitQueries';
import { displayRouteNumber, needsRouteConfirmation } from '@/lib/transit-format';
import { useProfileStore } from '@/lib/profile-store';
import { elevation, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { TransitSearchResult } from '@/lib/types';

type Props = {
  trip: TransitSearchResult;
  searchDay: string;
  expandedByDefault?: boolean;
  /** false on the trip detail screen — there is nowhere further to go. */
  linkToDetail?: boolean;
};

export function RouteCard({
  trip,
  searchDay,
  expandedByDefault = false,
  linkToDetail = true,
}: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const vote = useTripVote();
  const getVote = useProfileStore((s) => s.getVote);
  const [expanded, setExpanded] = useState(expandedByDefault);
  const currentVote = getVote(trip.id);
  const needsConfirmation = needsRouteConfirmation(trip.likesPercent);
  // The pole code and the +1 badge render only when the server sent them:
  // legacy-dataset results carry neither (03 §5b, 98 B2).
  const boardingPole = resolveBoardingPole(trip);
  const nextDay = arrivesNextDay(trip);
  const firstStop = trip.stops[0];
  const lastStop = trip.stops[trip.stops.length - 1];

  const openCharterInfo = () => {
    Alert.alert(t('contactBusCompaniesTitle'), t('confirmBusCompaniesDescription'));
  };

  const openDetail = () => {
    router.push({
      pathname: '/(tabs)/transit/[tripId]',
      params: { tripId: String(trip.id) },
    });
  };

  // On the trip detail screen `openDetail` would push the screen already on
  // top of the stack — a dead-looking link at best, a stack of duplicates at
  // worst. Tapping the card body there just toggles the stop list instead.
  const handleHeaderPress = linkToDetail ? openDetail : () => setExpanded((v) => !v);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
        elevation(2, theme.text),
      ]}
    >
      <Pressable onPress={handleHeaderPress} accessibilityRole="button">
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Bus size={22} color={theme.primary} />
            <Text style={[styles.routeNumber, { color: theme.primary }]}>
              {displayRouteNumber(trip.route)}
            </Text>
          </View>
          {boardingPole ? (
            <View style={[styles.poleChip, { borderColor: theme.border }]}>
              <Text style={[typography.caption, { color: theme.muted }]}>
                {boardingPole.code}
              </Text>
            </View>
          ) : null}
          {nextDay ? (
            <View style={[styles.poleChip, { borderColor: theme.warning }]}>
              <Text style={[typography.caption, { color: theme.warning }]}>+1</Text>
            </View>
          ) : null}
        </View>

        <SchedulePreviewChip />

        {needsConfirmation ? (
          <Pressable
            onPress={openCharterInfo}
            style={[styles.charterBanner, { backgroundColor: theme.warningSurface, borderColor: theme.warning }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[typography.caption, { color: theme.warning, fontWeight: '700' }]}>
                {t('confirmationRequired')}
              </Text>
              <Text style={[typography.caption, { color: theme.warning }]}>{t('confirmationMessage')}</Text>
            </View>
            <Phone size={18} color={theme.warning} />
          </Pressable>
        ) : null}

        <RouteTimeline
          startTime={trip.start}
          endTime={trip.end}
          originName={firstStop?.name ?? trip.origin}
          destinationName={lastStop?.name ?? trip.destination}
        />
      </Pressable>

      <View style={styles.voteRow}>
        <Pressable
          onPress={() =>
            vote.mutate({
              tripId: trip.id,
              intent: 'dislike',
              meta: {
                routeNumber: displayRouteNumber(trip.route),
                origin: firstStop?.name ?? trip.origin,
                destination: lastStop?.name ?? trip.destination,
              },
            })
          }
          style={styles.voteBtn}
          accessibilityLabel={t('transitDislikeAction')}
        >
          <ThumbsDown size={20} color={currentVote === 'dislike' ? theme.danger : theme.muted} />
        </Pressable>
        <Text style={[typography.caption, { color: theme.muted }]}>{trip.dislikesPercent}%</Text>

        <Pressable
          onPress={() => setExpanded((v) => !v)}
          style={styles.expandBtn}
          accessibilityLabel={t('clickToSeeDetails')}
        >
          <Text style={[typography.caption, { color: theme.info, fontWeight: '600' }]}>
            {t('clickToSeeDetails')}
          </Text>
          {expanded ? (
            <ChevronUp size={20} color={theme.info} />
          ) : (
            <ChevronDown size={20} color={theme.info} />
          )}
        </Pressable>

        <Text style={[typography.caption, { color: theme.muted }]}>{trip.likesPercent}%</Text>
        <Pressable
          onPress={() =>
            vote.mutate({
              tripId: trip.id,
              intent: 'like',
              meta: {
                routeNumber: displayRouteNumber(trip.route),
                origin: firstStop?.name ?? trip.origin,
                destination: lastStop?.name ?? trip.destination,
              },
            })
          }
          style={styles.voteBtn}
          accessibilityLabel={t('transitLikeAction')}
        >
          <ThumbsUp size={20} color={currentVote === 'like' ? theme.success : theme.muted} />
        </Pressable>
      </View>

      {expanded ? (
        <View style={[styles.stopsPanel, { backgroundColor: theme.surfaceVariant }]}>
          <Text style={[typography.label, { color: theme.text, marginBottom: space.sm }]}>
            {t('allStops')}
          </Text>
          {trip.stops.map((stop, index) => (
            <View
              key={`${stop.name}-${index}`}
              style={[styles.stopLine, { borderBottomColor: theme.border }]}
            >
              <Text style={[typography.caption, { color: theme.muted, flex: 1 }]}>{stop.name}</Text>
              <Text style={[typography.label, { color: theme.text }]}>{stop.time}</Text>
            </View>
          ))}
          <View style={styles.actions}>
            <TrackButton trip={trip} searchDay={searchDay} />
            <ShareTripButton trip={trip} />
            {linkToDetail ? (
              <Pressable onPress={openDetail}>
                <Text style={[typography.caption, { color: theme.primary, fontWeight: '600' }]}>
                  {t('clickToSeeDetails')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  poleChip: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 1,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  routeNumber: { fontSize: 20, fontWeight: '700' },
  charterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    padding: space.sm,
    marginBottom: space.sm,
    gap: space.sm,
  },
  voteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.lg,
    gap: space.xs,
  },
  voteBtn: { padding: space.xs },
  expandBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingVertical: space.sm,
  },
  stopsPanel: {
    marginTop: space.md,
    borderRadius: radius.md,
    padding: space.md,
  },
  stopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.md,
  },
});
