import { Share2 } from 'lucide-react-native';
import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { Banner } from '@/components/ui/Banner';
import { Card } from '@/components/ui/Card';
import { ErrorState, LoadingState } from '@/components/ui/StateView';
import { DepartureRow } from '@/features/transit/components/DepartureRow';
import { JourneyMap } from '@/features/transit/components/JourneyMap';
import { TripDetail } from '@/features/transit/components/TripDetail';
import { TransitWebShell } from '@/features/transit/components/TransitWebShell';
import { ScreenTopAdBanner } from '@/features/ads/components/ScreenTopAdBanner';
import { shareTrip } from '@/features/transit/share-trip';
import { useTransitDataset } from '@/features/transit/hooks/useScheduleConfig';
import { useBootstrap, useTripDetail } from '@/features/transit/hooks/useTransitQueries';
import { useTrackLive } from '@/features/transit/hooks/useTrackLive';
import { findCachedTrip } from '@/features/transit/lib/cached-trip';
import { journeyLiveVehicles } from '@/features/transit/lib/journey-live-markers';
import { annotateStopTimes } from '@/features/transit/lib/trip-live-stops';
import { fetchStopDetail, fetchTripGeometry } from '@/lib/api';
import { useFabActions } from '@/lib/fab-store';
import { resolveInfo } from '@/lib/infos';
import { journeyFromTripDetail } from '@/lib/journey-fallback';
import { useNetworkStatus } from '@/lib/network-status';
import { computeVotePercents, resolveDayType } from '@/lib/transit-format';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { TransitSearchResult, TripDetail as TripDetailData } from '@/lib/types';
import { Text } from 'react-native';

function tripFromDetail(detail: TripDetailData): TransitSearchResult {
  const percents =
    detail.likesPercent != null && detail.dislikesPercent != null
      ? { likesPercent: detail.likesPercent, dislikesPercent: detail.dislikesPercent }
      : computeVotePercents(detail.likes, detail.dislikes);

  return {
    id: detail.id,
    route: detail.route,
    origin: detail.stops[0]?.name ?? '',
    destination: detail.stops[detail.stops.length - 1]?.name ?? '',
    start: detail.stops[0]?.time ?? '',
    end: detail.stops[detail.stops.length - 1]?.time ?? '',
    typeOfDay: detail.typeOfDay,
    likesPercent: percents.likesPercent,
    dislikesPercent: percents.dislikesPercent,
    information: detail.information,
    stops: detail.stops,
  };
}

export default function TripDetailScreen() {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { isOnline } = useNetworkStatus();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const id = Number(tripId);

  const tripQuery = useTripDetail(id, Number.isFinite(id));
  const bootstrap = useBootstrap();
  const { trips: liveTrips } = useTrackLive(Number.isFinite(id) ? [id] : []);
  const queryClient = useQueryClient();
  const dataset = useTransitDataset();

  /*
   * GET /api/v3/transit/trips/{id} resolves its dataset from the server's own
   * date and ignores ?dataset=, so while previewing the NOT-yet-active network
   * every trip detail 404s. The search result the user tapped carries everything
   * this screen renders, so fall back to it rather than showing an error.
   */
  const cachedTrip = useMemo(() => {
    if (!tripQuery.isError && tripQuery.data) {
      return null;
    }
    const caches = queryClient
      .getQueriesData<TransitSearchResult[]>({ queryKey: ['transit', 'search'] })
      .map(([, data]) => data);
    return findCachedTrip(caches, id);
  }, [queryClient, id, tripQuery.isError, tripQuery.data]);

  const detail = tripQuery.data ?? null;
  // Nullable here — narrowed to non-null below, past the loading/error guards
  // that require one of `detail`/`cachedTrip` to be set.
  const rawTrip = detail ? tripFromDetail(detail) : cachedTrip;

  // Only fetched once the real detail response is in hand — `cachedTrip` is a
  // degraded fallback for a trip the server cannot resolve right now (preview
  // dataset, 404), and geometry would fail identically.
  const geometryQuery = useQuery({
    queryKey: ['transit', 'trip-geometry', id, dataset ?? 'server'],
    // No `from`/`to`: the whole trip, not a search result's board..alight slice.
    queryFn: () => fetchTripGeometry({ tripId: id, dataset }),
    enabled: Number.isFinite(id) && !!detail,
    // Timetable geometry does not move; a trip's shape is the same all day.
    staleTime: 60 * 60 * 1000,
  });

  const day = useMemo(
    () => resolveDayType(new Date(), bootstrap.data?.holidays),
    [bootstrap.data?.holidays],
  );
  const boardStopId = geometryQuery.data?.stops[0]?.stopId ?? null;

  // "The rest of the line's day", not "next departures" — a rider comparing
  // against this trip needs the earlier options too, so `start` is fixed at
  // midnight rather than the stop page's bucketed current time.
  const otherDeparturesQuery = useQuery({
    queryKey: ['transit', 'stop', boardStopId, day, dataset ?? 'server'],
    queryFn: () => fetchStopDetail({ stopId: boardStopId!, day, start: '00h00', dataset }),
    enabled: boardStopId != null,
  });

  const otherDepartures = useMemo(() => {
    if (!rawTrip) {
      return [];
    }
    return (otherDeparturesQuery.data?.departures ?? []).filter(
      (departure) => departure.route === rawTrip.route && departure.tripId !== rawTrip.id,
    );
  }, [otherDeparturesQuery.data, rawTrip]);

  const journey = detail ? journeyFromTripDetail(detail) : null;
  const liveVehicles = journey ? journeyLiveVehicles(journey, liveTrips) : [];
  // A stale reading is a real position with an unknown ETA (services_trip_live
  // sends an empty `upcomingStops` for it) — nothing to overlay onto the stop
  // list, so this naturally skips annotating anything in that case too.
  const liveVehicle = liveTrips.find((row) => row.tripId === id && row.state === 'live')?.vehicle;
  const formatEta = (minutes: number) =>
    minutes <= 0 ? t('azoresbusLiveEtaNow') : t('azoresbusLiveEtaMinutes', { count: minutes });

  const openFullMap = () => {
    if (!journey) {
      return;
    }
    // The full-screen map resolves its journey from the `['transit','search']`
    // cache, and this synthetic one was never in it.
    queryClient.setQueryData(['transit', 'search', 'trip-detail', journey.id], {
      journeys: [journey],
    });
    router.push({
      pathname: '/(tabs)/transit/map',
      params: { journeyId: journey.id },
    });
  };

  const fabActions = useMemo(() => {
    if (!rawTrip) {
      return [];
    }
    return [
      {
        key: 'share-trip',
        labelKey: 'fabShareTrip',
        icon: Share2,
        onPress: () => void shareTrip(rawTrip, { t, alertTitle: t('transitShareTitle') }),
      },
    ];
  }, [rawTrip, t]);

  useFabActions(fabActions);

  // With a cached trip in hand there is nothing to wait for — render it now and
  // let the detail request upgrade it if it succeeds.
  if (tripQuery.isLoading && !cachedTrip) {
    return (
      <Screen withStackHeader>
        <LoadingState />
      </Screen>
    );
  }

  if ((tripQuery.isError || !tripQuery.data) && !cachedTrip) {
    return (
      <Screen withStackHeader>
        <ErrorState
          title={t('noRoutesSubtitle')}
          actionLabel={t('settingsBack')}
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const trip = rawTrip!;
  const displayTrip =
    liveVehicle && liveVehicle.upcomingStops.length > 0
      ? { ...trip, stops: annotateStopTimes(trip.stops, liveVehicle.upcomingStops, formatEta) }
      : trip;

  const infoNotice =
    bootstrap.data?.infos?.find((info) => {
      const route = typeof info.route === 'string' ? info.route : '';
      return route === trip.route;
    }) ?? null;

  const resolvedNotice = infoNotice ? resolveInfo(infoNotice, i18n.language) : null;

  return (
    <Screen withStackHeader>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TransitWebShell>
          <ScreenTopAdBanner embedded />
          {!isOnline ? <Banner variant="offline" message={t('offlineSearchDisabled')} /> : null}

          {resolvedNotice?.message ? (
            <Card style={{ marginBottom: space.md }}>
              {resolvedNotice.title ? (
                <Text style={[typography.headline, { color: theme.text }]}>{resolvedNotice.title}</Text>
              ) : null}
              <Text style={[typography.body, { color: theme.text, marginTop: space.sm }]}>
                {resolvedNotice.message}
              </Text>
            </Card>
          ) : null}

          {journey ? (
            <JourneyMap
              journey={journey}
              variant="preview"
              onPress={openFullMap}
              liveVehicles={liveVehicles}
            />
          ) : null}

          <TripDetail trip={displayTrip} />

          {otherDepartures.length > 0 ? (
            <Card>
              <Text style={[typography.label, { color: theme.muted, marginBottom: space.sm }]}>
                {t('transitTripOtherDepartures')}
              </Text>
              {otherDepartures.map((departure) => (
                <DepartureRow
                  key={`${departure.tripId}-${departure.sequence}`}
                  departure={departure}
                  fallbackDestination={trip.destination}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/transit/[tripId]',
                      params: { tripId: String(departure.tripId) },
                    })
                  }
                />
              ))}
            </Card>
          ) : null}
        </TransitWebShell>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.md, paddingBottom: space['4xl'], alignItems: 'center' },
});
