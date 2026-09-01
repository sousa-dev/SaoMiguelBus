import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Bus, CloudOff, ExternalLink, MapPin, Star } from 'lucide-react-native';

import { Screen } from '@/components/Screen';
import { AzoresbusStopArrivals } from '@/features/azoresbus/components/AzoresbusStopArrivals';
import { useAzoresbusStopArrivals } from '@/features/azoresbus/hooks/useAzoresbusStopArrivals';
import { useTrackArrivalsOnce } from '@/features/azoresbus/hooks/useTrackArrivalsOnce';
import { azoresbusLiveVehicleHref } from '@/features/azoresbus/lib/liveHref';
import { trackLiveSelectVehicle } from '@/features/azoresbus/lib/live-analytics';
import {
  useResolvedTransitDataset,
  useScheduleConfig,
} from '@/features/transit/hooks/useScheduleConfig';
import { OsmMapView } from '@/components/OsmMapView';
import { EmptyState, LoadingState } from '@/components/ui/StateView';
import { IconButton } from '@/components/ui/IconButton';
import { DepartureRow } from '@/features/transit/components/DepartureRow';
import { useTransitDataset } from '@/features/transit/hooks/useScheduleConfig';
import { useStops } from '@/features/transit/hooks/useTransitQueries';
import { fetchStopDetail } from '@/lib/api';
import { coordinateToRegion, fitRegionForCoordinates } from '@/lib/island-map';
import type { MapOverlaySpec } from '@/lib/map-overlays';
import { useNetwork } from '@/lib/network-provider';
import { useProfileStore } from '@/lib/profile-store';
import { departuresStartTime, displayRouteNumber, resolveDayType } from '@/lib/transit-format';
import { useBootstrapCached } from '@/features/transit/hooks/useBootstrapQueries';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

const MAP_HEIGHT = 220;
const POLE_COLOR = '#1e88e5';

/** How often the clock this screen reads from is nudged forward. */
const CLOCK_TICK_MS = 60_000;

/**
 * One stop: exactly where it is, what serves it, and what leaves next.
 *
 * The map shows every POLE, not the collapsed stop. A `Stop` row is the
 * centroid of every pole sharing its name, so on a two-sided road it lands in
 * the middle of the carriageway — the one place a rider cannot stand. Which
 * side you want is the question this screen exists to answer.
 */
export default function TransitStopScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { isOnline } = useNetwork();
  const dataset = useTransitDataset();
  const { data: bootstrap } = useBootstrapCached();
  const params = useLocalSearchParams<{ stopId?: string }>();
  const stopId = Number(params.stopId);

  // Subscribe to the LIST, not to `isFavoriteStop`: the selector for an action
  // returns the same function reference forever, so toggling never re-rendered
  // this screen and the star stayed grey even though the favourite was saved.
  const favoriteStops = useProfileStore((s) => s.favoriteStops);
  const toggleFavoriteStop = useProfileStore((s) => s.toggleFavoriteStop);

  /**
   * The clock this screen reads from.
   *
   * Held in state rather than called inline, because "next departures" is a
   * claim that goes stale on its own: `new Date()` captured at mount would
   * pin the list to the moment the screen opened, and a screen left open
   * across midnight would keep yesterday's day type. Ticks every minute, and
   * resyncs on focus so a screen backgrounded for an hour is not stale the
   * instant it comes back.
   */
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, []);
  useFocusEffect(useCallback(() => setNow(new Date()), []));

  const day = useMemo(() => resolveDayType(now, bootstrap?.holidays), [now, bootstrap?.holidays]);
  // Bucketed, so this only changes a few times an hour — see
  // DEPARTURES_START_BUCKET_MINUTES for why rounding down is the right way.
  const start = departuresStartTime(now);

  // Live arrivals sit above the timetable, but only where they can exist: the
  // legacy network has no AVL feed, and the flag can retire the feature without
  // an app release.
  // `useTransitDataset` is the WIRE value and is null unless previewing, so the
  // gate needs the resolved one -- otherwise this never renders.
  // Already cached app-wide: the header and map need nothing else.
  const { data: allStops = [] } = useStops();
  const { showTracking } = useScheduleConfig();
  const resolvedDataset = useResolvedTransitDataset();
  const liveEnabled = showTracking && resolvedDataset === 'azoresbus';
  const arrivalsQuery = useAzoresbusStopArrivals(
    Number.isFinite(stopId) && stopId > 0 ? stopId : null,
    { enabled: liveEnabled, screenActive: liveEnabled },
  );

  useTrackArrivalsOnce(
    'stop_page',
    liveEnabled ? stopId : null,
    arrivalsQuery.data?.arrivals,
  );

  const query = useQuery({
    queryKey: ['transit', 'stop', stopId, day, start, dataset ?? 'server'],
    // `start` is what turns "today's timetable" into "what leaves from here
    // next" — without it the API returns the whole service day from its
    // beginning, so at 18:00 the list still opened with the 06:15.
    queryFn: () => fetchStopDetail({ stopId, day, start, dataset }),
    enabled: Number.isFinite(stopId) && stopId > 0,
    // The previous window's answer stays on screen while the next one loads,
    // so the list does not blank out every time the bucket rolls over.
    placeholderData: (previous) => previous,
  });

  const stop = query.data;

  /**
   * Name and coordinates, from the stop list the app already has cached.
   *
   * The detail response carries these too, but it also carries the timetable,
   * and waiting for all of it before drawing anything meant a rider stared at a
   * spinner to learn the name of the stop they had just tapped. Everything the
   * header and map need is in the list, so the page opens immediately and the
   * slower sections fill in around it.
   */
  const identity = useMemo(() => {
    if (stop) {
      return { name: stop.name, lat: stop.lat, lon: stop.lon };
    }
    const cached = allStops.find((candidate) => candidate.id === stopId);
    return cached
      ? { name: cached.name, lat: cached.latitude, lon: cached.longitude }
      : null;
  }, [allStops, stop, stopId]);

  const favorite = identity ? favoriteStops.some((f) => f.id === stopId) : false;

  const markers = useMemo(() => {
    if (!identity) {
      return [];
    }
    // Fall back to the stop itself when there are no poles, which is every
    // legacy stop — and also the state before the detail arrives. A single
    // approximate pin still answers "roughly where".
    return stop && stop.poles.length > 0
      ? stop.poles.map((pole) => ({
          id: `pole-${pole.code}`,
          title: pole.code,
          latitude: pole.lat,
          longitude: pole.lon,
        }))
      : [{
          id: 'stop',
          title: identity.name,
          latitude: identity.lat,
          longitude: identity.lon,
        }];
  }, [identity, stop]);

  const region = useMemo(() => {
    if (markers.length === 0) {
      return undefined;
    }
    return markers.length === 1
      ? coordinateToRegion(
          { lat: markers[0].latitude, lng: markers[0].longitude },
          0.004,
        )
      : fitRegionForCoordinates(
          markers.map((m) => ({ latitude: m.latitude, longitude: m.longitude })),
          0.004,
        );
  }, [markers]);

  const androidOverlays = useMemo(
    (): MapOverlaySpec => ({
      markers: markers.map((marker) => ({
        id: marker.id,
        latitude: marker.latitude,
        longitude: marker.longitude,
        pinColor: POLE_COLOR,
        title: marker.title,
        showLabel: true,
        size: 24,
      })),
      polylines: [],
    }),
    [markers],
  );

  // Only genuinely blocked when we know nothing at all -- a cold start with no
  // cached stop list. Everything else renders now and fills in.
  if (!identity && query.isLoading) {
    return (
      <Screen withStackHeader>
        <LoadingState />
      </Screen>
    );
  }

  if (!identity) {
    return (
      <Screen withStackHeader>
        <EmptyState icon={MapPin} title={t('transitStopNotFound')} />
      </Screen>
    );
  }

  const openInMaps = () => {
    const label = encodeURIComponent(identity?.name ?? '');
    const url = Platform.select({
      ios: `maps://?ll=${identity?.lat},${identity?.lon}&q=${label}`,
      default: `geo:${identity?.lat},${identity?.lon}?q=${identity?.lat},${identity?.lon}(${label})`,
    });
    void Linking.openURL(url);
  };

  return (
    <Screen withStackHeader>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.headline, { color: theme.text }]}>{identity.name}</Text>
            <Text style={[typography.caption, { color: theme.muted }]}>
              {identity.lat.toFixed(5)}, {identity.lon.toFixed(5)}
            </Text>
          </View>
          <IconButton
            icon={Star}
            variant="ghost"
            color={favorite ? theme.warning : theme.muted}
            fill={favorite ? 'currentColor' : undefined}
            accessibilityLabel={favorite ? t('removeFavorites') : t('addToFavorites')}
            onPress={() => toggleFavoriteStop({ id: stopId, name: identity.name })}
          />
        </View>

        {isOnline ? (
          <View style={[styles.mapFrame, { borderColor: theme.border }]}>
            <OsmMapView
              style={styles.map}
              initialRegion={region}
              androidOverlays={androidOverlays}
              accessibilityLabel={t('transitStopMapA11y', { stop: identity.name })}
            >
              {Platform.OS === 'ios'
                ? markers.map((marker) => (
                    <Marker
                      key={marker.id}
                      coordinate={{
                        latitude: marker.latitude,
                        longitude: marker.longitude,
                      }}
                      title={marker.title}
                      pinColor={POLE_COLOR}
                    />
                  ))
                : null}
            </OsmMapView>
          </View>
        ) : (
          <View
            style={[
              styles.mapFrame,
              styles.offline,
              { borderColor: theme.border, backgroundColor: theme.surfaceVariant },
            ]}
          >
            <CloudOff size={22} color={theme.muted} />
            <Text style={[typography.caption, { color: theme.muted, marginTop: space.sm }]}>
              {t('transitMapOffline')}
            </Text>
          </View>
        )}

        <Pressable onPress={openInMaps} style={styles.mapsLink} accessibilityRole="button">
          <ExternalLink size={16} color={theme.primary} />
          <Text style={[typography.label, { color: theme.primary }]}>
            {t('transitOpenInMaps')}
          </Text>
        </Pressable>

        {stop && stop.poles.length > 1 ? (
          <Section title={t('transitStopPoles')}>
            <Text style={[typography.caption, { color: theme.muted }]}>
              {t('transitStopPolesHint')}
            </Text>
            <View style={styles.chips}>
              {stop.poles.map((pole) => (
                <View
                  key={pole.code}
                  style={[styles.chip, { borderColor: theme.border }]}
                >
                  <Text style={[typography.caption, { color: theme.text }]}>{pole.code}</Text>
                </View>
              ))}
            </View>
          </Section>
        ) : null}

        {stop && stop.lines.length > 0 ? (
          <Section title={t('transitStopLines')}>
            <View style={styles.chips}>
              {stop.lines.map((line) => (
                <View
                  key={line}
                  style={[styles.lineChip, { backgroundColor: theme.primary }]}
                >
                  <Text style={[typography.label, { color: theme.onPrimary }]}>
                    {displayRouteNumber(line)}
                  </Text>
                </View>
              ))}
            </View>
          </Section>
        ) : null}

        {liveEnabled ? (
          <Section title={t('azoresbusLiveStopArrivals')}>
            <AzoresbusStopArrivals
              arrivals={arrivalsQuery.data?.arrivals}
              isLoading={arrivalsQuery.isLoading}
              isError={arrivalsQuery.isError}
              updatedAt={arrivalsQuery.dataUpdatedAt}
              isRefetching={arrivalsQuery.isRefetching}
              onSelectVehicle={(vehicleId) => {
                trackLiveSelectVehicle('stop_page', { vehicle: vehicleId });
                router.push(azoresbusLiveVehicleHref(vehicleId));
              }}
            />
          </Section>
        ) : null}

        <Section title={t('transitStopNextDepartures')}>
          {/* Says out loud which window is being shown. Without it an empty
              list at 23:00 is indistinguishable from a stop with no service,
              and a rider has no way to tell that earlier buses were filtered
              out rather than missing. */}
          <Text style={[typography.caption, styles.departuresFrom, { color: theme.muted }]}>
            {t('transitStopDeparturesFrom', { time: start.replace('h', ':') })}
          </Text>
          {!stop ? (
            <Text style={[typography.caption, { color: theme.muted }]}>
              {t('transitStopLoadingDepartures')}
            </Text>
          ) : stop.departures.length === 0 ? (
            <Text style={[typography.caption, { color: theme.muted }]}>
              {t('transitStopNoMoreDeparturesToday')}
            </Text>
          ) : (
            stop.departures.map((departure) => (
              <DepartureRow
                key={`${departure.tripId}-${departure.sequence}`}
                departure={departure}
                fallbackDestination={identity.name}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/transit/[tripId]',
                    params: { tripId: String(departure.tripId) },
                  })
                }
              />
            ))
          )}
        </Section>
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useAppTheme();
  return (
    <View style={styles.section}>
      <Text style={[typography.label, { color: theme.muted, marginBottom: space.sm }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.md, gap: space.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  mapFrame: {
    height: MAP_HEIGHT,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  offline: { alignItems: 'center', justifyContent: 'center' },
  map: { flex: 1 },
  mapsLink: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  section: { gap: space.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.xs },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  lineChip: {
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    minWidth: 40,
    alignItems: 'center',
  },
  departuresFrom: { marginBottom: space.sm },
  departure: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  routeBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    minWidth: 38,
    alignItems: 'center',
  },
});
