import { useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/ui/StateView';
import { space } from '@/lib/tokens';
import { Bus, Shuffle } from 'lucide-react-native';

import { Banner } from '@/components/ui/Banner';
import { AdBanner } from '@/features/ads/components/AdBanner';
import { InterstitialOrchestrator } from '@/features/ads/components/InterstitialOrchestrator';
import { ActiveTrackingSection } from '@/features/transit/components/ActiveTrackingSection';
import { HopOnHopOffCtaRow } from '@/features/hop-on-hop-off/components/HopOnHopOffCtaRow';
import { useHopOnHopOffPromo } from '@/features/hop-on-hop-off/hooks/useHopOnHopOffPromo';
import { MinibusTransitLink } from '@/features/transit/components/MinibusTransitLink';
import { TransitPricesLink } from '@/features/transit/components/TransitPricesLink';
import { PinnedRoutesSection } from '@/features/transit/components/PinnedRoutesSection';
import { RouteResults } from '@/features/transit/components/RouteResults';
import { ScheduleChangeBanner } from '@/features/transit/components/ScheduleChangeBanner';
import { SchedulePreviewStrip } from '@/features/transit/components/SchedulePreviewNotice';
import { RouteWeatherGrid } from '@/features/transit/components/RouteWeatherGrid';
import { TransitInstructionCard } from '@/features/transit/components/TransitInstructionCard';
import { TransitPlannerCard } from '@/features/transit/components/TransitPlannerCard';
import { TransitWebShell } from '@/features/transit/components/TransitWebShell';
import { useRouteWeather } from '@/features/transit/hooks/useRouteWeather';
import {
  useCanSearchOffline,
  useTransitSearchWithOffline,
} from '@/features/transit/hooks/useOfflineSearch';
import { useBootstrap, useStops } from '@/features/transit/hooks/useTransitQueries';
import { useResolvedTransitDataset } from '@/features/transit/hooks/useScheduleConfig';
import { TransitMapLinks } from '@/features/transit/components/TransitMapLinks';
import { useUserDataMigration } from '@/features/transit/hooks/useUserDataMigration';
import { useNetwork } from '@/lib/network-provider';
import { WifiOff } from 'lucide-react-native';
import { migrateLegacyFavorites, useProfileStore } from '@/lib/profile-store';
import { useAppTheme } from '@/lib/theme';
import { resolveDayType } from '@/lib/transit-format';
import { resolveEnabledModules } from '@/config/island';

/** Legacy webapp treats an unset time as midnight and returns the full day schedule. */
const DEFAULT_SEARCH_TIME = '00:00';

/**
 * Breathing room above the results when the screen jumps to them, so the last
 * line of the search form stays visible. Landing with the answer flush against
 * the top edge reads as though the form has gone.
 */
const RESULTS_SCROLL_PADDING = 12;

/**
 * The ScrollView's own content padding. `onLayout` reports a child's offset
 * within its PARENT, and the results wrapper sits inside `TransitWebShell`, so
 * the shell's own top offset has to be added back to get a scroll coordinate.
 * Derived from the same token `styles.content` uses, so the two cannot drift.
 */
const SHELL_TOP_OFFSET = space.md;

function searchParam(value: string | string[] | undefined): string {
  if (value == null) {
    return '';
  }
  return typeof value === 'string' ? value : (value[0] ?? '');
}

export default function TransitScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  // `stop` is the Azores Offline Map app's bus-stop deep link (saomiguelhub://transit?stop=…,
  // SDD 03 §6.3 in that repo). It carries a NAME, not an id. Now that a stop page
  // exists, a name we can resolve goes straight there — what that link always
  // meant. One that resolves to nothing still falls back to filling `destination`,
  // the "acceptable" degraded target that doc names explicitly, because a
  // dead-end deep link is worse than a useful approximation.
  const params = useLocalSearchParams<{ origin?: string; destination?: string; stop?: string }>();
  const { isOnline, isPremium } = useNetwork();
  const canSearchOffline = useCanSearchOffline();
  const bootstrap = useBootstrap();
  const showMinibus = resolveEnabledModules(bootstrap.data?.island?.enabledModules).includes('minibus');
  const { visible: showHopOnOff } = useHopOnHopOffPromo();
  const { data: stops = [], isLoading: stopsLoading } = useStops();
  // Maps exist only where geometry does, which today means AzoresBus.
  const hasMaps = useResolvedTransitDataset() === 'azoresbus';
  // Re-point saved favourites and recents whenever the active network changes
  // (03 §5d). Driven by the stop list, never by a date.
  useUserDataMigration();
  const addRecentSearch = useProfileStore((s) => s.addRecentSearch);

  const [origin, setOrigin] = useState(() => searchParam(params.origin));
  const [destination, setDestination] = useState(() => searchParam(params.destination) || searchParam(params.stop));
  const [date, setDate] = useState(() => new Date());
  const [time, setTime] = useState(DEFAULT_SEARCH_TIME);
  const [searchEnabled, setSearchEnabled] = useState(false);
  // ON unless the rider says otherwise, and it resets with the screen: a rider
  // who once wanted a single bus should not silently keep getting fewer options
  // days later without remembering why.
  const [allowTransfers, setAllowTransfers] = useState(true);
  const [interstitialTrigger, setInterstitialTrigger] = useState(0);

  // Resolved once the stops list is in hand, so a cold start still lands on the
  // stop page rather than racing the query.
  useEffect(() => {
    const wanted = searchParam(params.stop);
    if (!wanted || stops.length === 0) {
      return;
    }
    const folded = wanted.trim().toLowerCase();
    const match = stops.find((stop) => stop.name.trim().toLowerCase() === folded);
    if (match) {
      router.replace({
        pathname: '/(tabs)/transit/stop/[stopId]',
        params: { stopId: String(match.id) },
      });
    }
  }, [params.stop, stops, router]);

  useEffect(() => {
    const nextOrigin = searchParam(params.origin);
    const nextDestination = searchParam(params.destination) || searchParam(params.stop);
    if (nextOrigin) {
      setOrigin(nextOrigin);
    }
    if (nextDestination) {
      setDestination(nextDestination);
    }
  }, [params.origin, params.destination, params.stop]);

  const day = useMemo(
    () => resolveDayType(date, bootstrap.data?.holidays),
    [date, bootstrap.data?.holidays],
  );

  useEffect(() => {
    void migrateLegacyFavorites();
  }, []);

  const searchParams = useMemo(
    () => ({
      origin,
      destination,
      day,
      userTime: time.replace(':', 'h'),
      allowTransfers,
      enabled: searchEnabled && Boolean(origin && destination),
    }),
    [origin, destination, day, time, searchEnabled, allowTransfers],
  );

  const search = useTransitSearchWithOffline(searchParams);
  const hasResults = Boolean(search.data && search.data.length > 0);
  const earliestArrival = search.data?.[0]?.end;
  const routeWeather = useRouteWeather({
    origin,
    destination,
    date,
    time,
    earliestArrival,
    enabled: searchParams.enabled && hasResults,
  });
  const showRouteWeather = Boolean(
    routeWeather.data?.origin && routeWeather.data.destination,
  );

  useEffect(() => {
    if (search.data && search.data.length > 0 && searchEnabled) {
      addRecentSearch({ origin, destination, day, time });
    }
  }, [search.data, searchEnabled, origin, destination, day, time, addRecentSearch]);

  useEffect(() => {
    if (!searchEnabled || search.isFetching) {
      return;
    }
    setInterstitialTrigger((value) => value + 1);
  }, [searchEnabled, search.isFetching, search.status]);

  const scrollRef = useRef<ScrollView>(null);
  // Where the answer starts, measured rather than estimated — the block above it
  // changes height with the schedule banner, the ad and the map link.
  const resultsY = useRef<number | null>(null);
  // Where the FORM starts, measured for the same reason. Needed because the
  // saved-search shortcuts (favourites, pinned routes) sit far below it and
  // silently rewrite it.
  const plannerY = useRef<number | null>(null);
  // Only a search the USER ran scrolls. Results also arrive from the cache on
  // mount and on a dataset switch, and yanking the screen then would be the app
  // moving on its own.
  const scrollWhenReady = useRef(false);

  const runSearch = () => {
    if (!origin || !destination || !canSearchOffline) {
      return;
    }
    setSearchEnabled(true);
    scrollWhenReady.current = true;
    search.refetch();
    // Rotate the top banner on each new search (webapp re-calls loadAdBanner).
    void queryClient.invalidateQueries({ queryKey: ['ad', 'home'] });
  };

  const openDirections = () => {
    if (!isOnline) {
      return;
    }
    router.push({
      pathname: '/(tabs)/transit/directions',
      params: {
        origin,
        destination,
        day,
        start: time.replace(':', 'h'),
      },
    });
  };

  /**
   * Run a search the rider picked from a saved shortcut rather than typed.
   *
   * Always scrolls back to the FORM. The favourites panel opens underneath the
   * results, so tapping a row there rewrites two fields the rider cannot see
   * and the list below quietly becomes the answer to a different question —
   * with no visible cause. Landing on the form shows the new origin and
   * destination in the boxes that produced them; the results follow underneath
   * as usual. This does not use `scrollWhenReady`, which exists for the
   * opposite move (jump DOWN to the answer after the rider presses Search).
   */
  const applySearch = (nextOrigin: string, nextDestination: string) => {
    setOrigin(nextOrigin);
    setDestination(nextDestination);
    setSearchEnabled(true);
    if (plannerY.current !== null) {
      scrollRef.current?.scrollTo({
        y: Math.max(0, SHELL_TOP_OFFSET + plannerY.current - RESULTS_SCROLL_PADDING),
        animated: true,
      });
    }
  };

  // Scroll once the search has SETTLED, not when it starts: jumping to a
  // spinner and then having the list grow underneath is worse than waiting.
  // An empty result scrolls too — "no connection, but 4 with a change" is the
  // answer, and it is the one a rider most needs to actually read.
  //
  // Keyed on the fetch going busy -> idle rather than on `data`, because
  // `refetch()` is async: at the moment Search is tapped the query has not
  // started yet, and reacting to data alone would scroll against the PREVIOUS
  // results before the new ones land.
  const wasFetching = useRef(false);
  useEffect(() => {
    const settled = wasFetching.current && !search.isFetching;
    wasFetching.current = search.isFetching;

    if (!settled || !scrollWhenReady.current || resultsY.current === null) {
      return;
    }
    scrollWhenReady.current = false;
    scrollRef.current?.scrollTo({
      y: Math.max(0, SHELL_TOP_OFFSET + resultsY.current - RESULTS_SCROLL_PADDING),
      animated: true,
    });
  }, [search.isFetching]);

  const showEmptyResults =
    searchEnabled && !search.isFetching && search.data && search.data.length === 0;
  // Offer the retry only when a change of bus would actually find something.
  // `transfersAvailable` is undefined when there is no honest number to show
  // (transfers were already allowed, or the API is too old to say) and 0 when a
  // change genuinely would not help — neither should promise a rider anything.
  const canOfferTransfers = Boolean(
    showEmptyResults && !allowTransfers && (search.transfersAvailable ?? 0) > 0,
  );
  const showInstructions = !searchEnabled && !hasResults;

  return (
    <Screen withStackHeader>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TransitWebShell>
          {!isOnline && !canSearchOffline ? (
            <Banner
              variant="offline"
              icon={WifiOff}
              message={isPremium ? t('offlineSearchNoCacheBody') : t('offlinePremiumRequired')}
            />
          ) : null}

          <ActiveTrackingSection />
          <PinnedRoutesSection onSelect={(o, d) => applySearch(o, d)} />

          <AdBanner on="home" slot="top" />

          {/* Renders nothing until the server arms a cutover instant (03 §2). */}
          <ScheduleChangeBanner />

          {/* Below the schedule banner on purpose: the network map shows the NEW
              timetables, so the "these are not in force yet" warning has to be
              read first or the map quietly contradicts it. */}
          {hasMaps ? <TransitMapLinks /> : null}

          <View onLayout={(event) => { plannerY.current = event.nativeEvent.layout.y; }}>
          {!stopsLoading || !isOnline ? (
            <TransitPlannerCard
              origin={origin}
              destination={destination}
              date={date}
              time={time}
              stops={stops}
              isOnline={canSearchOffline}
              directionsOnline={isOnline}
              searching={search.isFetching}
              allowTransfers={allowTransfers}
              onOriginChange={setOrigin}
              onDestinationChange={setDestination}
              onDateChange={setDate}
              onTimeChange={setTime}
              onSearch={runSearch}
              onDirections={openDirections}
              onAllowTransfersChange={setAllowTransfers}
            />
          ) : (
            <ActivityIndicator color={theme.primary} style={{ marginVertical: space.xl }} />
          )}
          </View>

          <View onLayout={(event) => { resultsY.current = event.nativeEvent.layout.y; }}>
          {search.isFetching && !hasResults ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: space.lg }} />
          ) : null}

          {showEmptyResults ? (
            canOfferTransfers ? (
              <EmptyState
                icon={Shuffle}
                title={t('noDirectRoutesMessage', { origin, destination })}
                description={t('noDirectRoutesSubtitle', {
                  count: search.transfersAvailable ?? 0,
                })}
                actionLabel={t('enableTransfersButton')}
                onAction={() => setAllowTransfers(true)}
              />
            ) : (
              <EmptyState
                icon={Bus}
                title={t('noRoutesMessage', { origin, destination })}
                description={t('noRoutesSubtitle')}
                actionLabel={isOnline ? t('tryDirectionsButton') : undefined}
                onAction={isOnline ? openDirections : undefined}
              />
            )
          ) : null}

          {showRouteWeather && routeWeather.data?.origin && routeWeather.data.destination ? (
            <RouteWeatherGrid
              origin={routeWeather.data.origin}
              destination={routeWeather.data.destination}
            />
          ) : null}

          {/* The caveat rides with the RESULTS, not the screen (03 §3). */}
          {hasResults ? <SchedulePreviewStrip /> : null}

          {hasResults && search.data ? (
            <RouteResults
              results={search.data}
              searchDay={day}
              origin={origin}
              destination={destination}
              onFavoriteSelect={(o, d) => applySearch(o, d)}
            />
          ) : null}
          </View>

          {showInstructions ? <TransitPricesLink /> : null}
          {showInstructions && showMinibus ? <MinibusTransitLink /> : null}
          {showInstructions && showMinibus && showHopOnOff ? (
            <HopOnHopOffCtaRow source="transit" />
          ) : null}
          {showInstructions ? <TransitInstructionCard /> : null}
        </TransitWebShell>
      </ScrollView>
      <InterstitialOrchestrator
        trigger={interstitialTrigger}
        ready={searchEnabled && !search.isFetching}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: space.md,
    paddingBottom: space['4xl'],
    alignItems: 'center',
  },
});
