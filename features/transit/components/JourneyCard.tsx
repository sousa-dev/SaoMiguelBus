import {
  ArrowRight,
  Bus,
  TriangleAlert,
  ChevronDown,
  ChevronUp,
  Clock,
  Footprints,
  Phone,
  Map as MapIcon,
  Shuffle,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { JourneyMap } from '@/features/transit/components/JourneyMap';
import { RouteTimeline } from '@/features/transit/components/RouteTimeline';
import { ShareTripButton } from '@/features/transit/components/ShareTripButton';
import { TrackButton } from '@/features/transit/components/TrackButton';
import { SchedulePreviewChip } from '@/features/transit/components/SchedulePreviewNotice';
import { rideLegAsTrip } from '@/features/transit/lib/journey-legs';
import { useTripVote } from '@/features/transit/hooks/useTransitQueries';
import {
  displayRouteNumber,
  formatDurationWords,
  needsRouteConfirmation,
} from '@/lib/transit-format';
import { useProfileStore } from '@/lib/profile-store';
import { elevation, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import {
  journeyRideLegs,
  type TransitJourney,
  type TransitRideLeg,
  type TransitTransferLeg,
} from '@/lib/types';

type Props = {
  journey: TransitJourney;
  searchDay: string;
  expandedByDefault?: boolean;
};

/**
 * One itinerary: a single bus, or two with a change between them.
 *
 * The transfer is rendered as its own row rather than folded into the ride that
 * follows, because that is the part a rider needs to plan around — where to get
 * off, how long they are standing there, whether they have to walk.
 */
export function JourneyCard({ journey, searchDay, expandedByDefault = false }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(expandedByDefault);
  const router = useRouter();

  const rides = journeyRideLegs(journey);
  // The itinerary is only as trustworthy as its least-trusted bus.
  const needsConfirmation = rides.some((leg) => needsRouteConfirmation(leg.likesPercent));
  const tightChange = journey.legs.some((leg) => leg.kind === 'transfer' && leg.tight);

  const openCharterInfo = () => {
    Alert.alert(t('contactBusCompaniesTitle'), t('confirmBusCompaniesDescription'));
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
        elevation(2, theme.text),
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Bus size={22} color={theme.primary} />
          {rides.map((leg, index) => (
            <React.Fragment key={`${leg.tripId}-badge`}>
              {index > 0 ? <ArrowRight size={14} color={theme.muted} /> : null}
              <Text style={[styles.routeNumber, { color: theme.primary }]}>
                {displayRouteNumber(leg.route)}
              </Text>
            </React.Fragment>
          ))}
        </View>

        <View style={styles.headerRight}>
          {tightChange ? (
            <View style={[styles.chip, { borderColor: theme.warning }]}>
              <TriangleAlert size={12} color={theme.warning} />
            </View>
          ) : null}
          {journey.dayOffset > 0 ? (
            <View style={[styles.chip, { borderColor: theme.warning }]}>
              <Text style={[typography.caption, { color: theme.warning }]}>+1</Text>
            </View>
          ) : null}
          <View style={styles.metaRow}>
            <Shuffle size={14} color={theme.muted} />
            <Text style={[typography.caption, { color: theme.muted, marginLeft: 4 }]}>
              {journey.transfers === 0
                ? t('transitDirectJourney')
                : t('transitTransfersCount', { count: journey.transfers })}
            </Text>
          </View>
        </View>
      </View>

      <SchedulePreviewChip />

      {needsConfirmation ? (
        <Pressable
          onPress={openCharterInfo}
          style={[
            styles.charterBanner,
            { backgroundColor: theme.warningSurface, borderColor: theme.warning },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[typography.caption, { color: theme.warning, fontWeight: '700' }]}>
              {t('confirmationRequired')}
            </Text>
            <Text style={[typography.caption, { color: theme.warning }]}>
              {t('confirmationMessage')}
            </Text>
          </View>
          <Phone size={18} color={theme.warning} />
        </Pressable>
      ) : null}

      <RouteTimeline
        startTime={journey.start}
        endTime={journey.end}
        originName={rides[0]?.board.name ?? ''}
        destinationName={rides[rides.length - 1]?.alight.name ?? ''}
      />

      <Pressable
        onPress={() => setExpanded((value) => !value)}
        style={styles.expandBtn}
        accessibilityLabel={t('clickToSeeDetails')}
      >
        <Text style={[typography.caption, { color: theme.info, fontWeight: '600' }]}>
          {expanded ? t('transitHideSteps') : t('transitShowSteps')}
        </Text>
        {expanded ? (
          <ChevronUp size={20} color={theme.info} />
        ) : (
          <ChevronDown size={20} color={theme.info} />
        )}
      </Pressable>

      {expanded ? (
        <View style={styles.legs}>
          {/* Behind the toggle on purpose, and not only for tidiness: mounting
              this is what FETCHES the geometry, so a screen of 20 results no
              longer fires ~30 requests for maps nobody opened. Renders null
              when the journey has no geometry — every legacy journey. */}
          <View style={styles.mapPreview}>
            <JourneyMap
              journey={journey}
              variant="preview"
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/transit/map',
                  params: { journeyId: journey.id },
                })
              }
            />
          </View>

          {journey.legs.map((leg, index) =>
            leg.kind === 'transfer' ? (
              <TransferRow key={`transfer-${index}`} leg={leg} />
            ) : (
              <RideLegPanel
                key={`ride-${leg.tripId}-${leg.board.sequence}`}
                leg={leg}
                journey={journey}
                searchDay={searchDay}
              />
            ),
          )}
        </View>
      ) : null}
    </View>
  );
}

function TransferRow({ leg }: { leg: TransitTransferLeg }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const walks = leg.walkMinutes > 0;
  const accent = leg.tight ? theme.warning : theme.info;

  return (
    <View style={{ gap: space.xs }}>
      <View style={[styles.transferRow, { borderColor: theme.border }]}>
        <Shuffle size={16} color={accent} />
        <View style={{ flex: 1 }}>
          <Text style={[typography.label, { color: theme.text }]}>
            {t('transitTransferAt', { stop: leg.at })}
          </Text>
          <View style={styles.transferMeta}>
            <Clock size={12} color={theme.muted} />
            <Text style={[typography.caption, { color: theme.muted }]}>
              {t('transitWaitDuration', {
                duration: formatDurationWords(t, leg.waitMinutes),
              })}
            </Text>
            {walks ? (
              <>
                <Footprints size={12} color={theme.muted} />
                <Text style={[typography.caption, { color: theme.muted }]}>
                  {t('transitWalkFromTo', { from: leg.from, count: leg.walkMinutes })}
                </Text>
              </>
            ) : null}
          </View>
        </View>
      </View>

      {/* The number quoted is the SLACK, not the raw wait — with a walk in the
          change those differ, and the slack is the one the rider is racing. */}
      {leg.tight ? (
        <View
          style={[
            styles.tightWarning,
            { backgroundColor: theme.warningSurface, borderColor: theme.warning },
          ]}
        >
          <TriangleAlert size={14} color={theme.warning} />
          <View style={{ flex: 1 }}>
            <Text style={[typography.caption, { color: theme.warning, fontWeight: '700' }]}>
              {t('transitTightTransferTitle', { count: leg.slackMinutes })}
            </Text>
            <Text style={[typography.caption, { color: theme.warning }]}>
              {walks
                ? t('transitTightTransferWalk', { stop: leg.at })
                : t('transitTightTransferBody')}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/**
 * One bus within the itinerary, with its own stop list and vote controls —
 * votes are per trip, so they belong on the leg rather than the journey.
 */
function RideLegPanel({
  leg,
  journey,
  searchDay,
}: {
  leg: TransitRideLeg;
  journey: TransitJourney;
  searchDay: string;
}) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const vote = useTripVote();
  const getVote = useProfileStore((s) => s.getVote);
  const currentVote = getVote(leg.tripId);
  const [showStops, setShowStops] = useState(false);

  const trip = rideLegAsTrip(leg, journey);
  const voteMeta = {
    routeNumber: displayRouteNumber(leg.route),
    origin: leg.board.name,
    destination: leg.alight.name,
  };

  return (
    <View style={[styles.legPanel, { backgroundColor: theme.surfaceVariant }]}>
      <View style={styles.legHeader}>
        <View style={[styles.legBadge, { backgroundColor: theme.primary }]}>
          <Text style={[typography.label, { color: theme.onPrimary }]}>
            {displayRouteNumber(leg.route)}
          </Text>
        </View>
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/(tabs)/transit/[tripId]',
              params: { tripId: String(leg.tripId) },
            })
          }
          style={{ flex: 1 }}
          accessibilityRole="button"
        >
          <Text style={[typography.caption, { color: theme.muted }]}>
            {t('transitStepBoard', { stop: leg.board.name, time: leg.board.time })}
          </Text>
          <Text style={[typography.caption, { color: theme.muted }]}>
            {t('transitStepAlight', { stop: leg.alight.name, time: leg.alight.time })}
          </Text>
        </Pressable>
      </View>

      <Pressable onPress={() => setShowStops((value) => !value)} style={styles.legStopsToggle}>
        <Text style={[typography.caption, { color: theme.info, fontWeight: '600' }]}>
          {t('transitStopsCount', { count: Math.max(0, leg.stops.length - 1) })}
        </Text>
        {showStops ? (
          <ChevronUp size={16} color={theme.info} />
        ) : (
          <ChevronDown size={16} color={theme.info} />
        )}
      </Pressable>

      {showStops
        ? leg.stops.map((stop, index) => (
            <View
              key={`${stop.name}-${index}`}
              style={[styles.stopLine, { borderBottomColor: theme.border }]}
            >
              <Text style={[typography.caption, { color: theme.muted, flex: 1 }]}>{stop.name}</Text>
              <Text style={[typography.label, { color: theme.text }]}>{stop.time}</Text>
            </View>
          ))
        : null}

      <View style={styles.voteRow}>
        <Pressable
          onPress={() => vote.mutate({ tripId: leg.tripId, intent: 'dislike', meta: voteMeta })}
          style={styles.voteBtn}
          accessibilityLabel={t('transitDislikeAction')}
        >
          <ThumbsDown size={20} color={currentVote === 'dislike' ? theme.danger : theme.muted} />
        </Pressable>
        <Text style={[typography.caption, { color: theme.muted }]}>{leg.dislikesPercent}%</Text>

        <View style={{ flex: 1 }} />

        <Text style={[typography.caption, { color: theme.muted }]}>{leg.likesPercent}%</Text>
        <Pressable
          onPress={() => vote.mutate({ tripId: leg.tripId, intent: 'like', meta: voteMeta })}
          style={styles.voteBtn}
          accessibilityLabel={t('transitLikeAction')}
        >
          <ThumbsUp size={20} color={currentVote === 'like' ? theme.success : theme.muted} />
        </Pressable>
      </View>

      {/* Per LEG, not per journey: tracking and sharing are per-bus operations
          and `ActiveTrack`/`PinnedRoute` hold one trip each. */}
      <View style={styles.actions}>
        <TrackButton trip={trip} searchDay={searchDay} />
        <ShareTripButton trip={trip} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexShrink: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  routeNumber: { fontSize: 20, fontWeight: '700' },
  chip: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 1,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  charterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    padding: space.sm,
    marginBottom: space.sm,
    gap: space.sm,
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingVertical: space.sm,
    marginTop: space.sm,
  },
  mapPreview: { marginBottom: space.xs },
  legs: { gap: space.sm },
  legPanel: { borderRadius: radius.md, padding: space.md, gap: space.sm },
  legHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  legBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    minWidth: 42,
    alignItems: 'center',
  },
  legStopsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  transferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderLeftWidth: 2,
    borderStyle: 'dashed',
    paddingVertical: space.sm,
    paddingLeft: space.md,
    marginLeft: space.md,
  },
  tightWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderLeftWidth: 3,
    borderRadius: radius.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    marginLeft: space.md,
  },
  transferMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  stopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  voteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  voteBtn: { padding: space.xs },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.md,
  },
});
