import { useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
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
import { useUserDataMigration } from '@/features/transit/hooks/useUserDataMigration';
import { useNetwork } from '@/lib/network-provider';
import { WifiOff } from 'lucide-react-native';
import { migrateLegacyFavorites, useProfileStore } from '@/lib/profile-store';
import { useAppTheme } from '@/lib/theme';
import { resolveDayType } from '@/lib/transit-format';
import { resolveEnabledModules } from '@/config/island';

/** Legacy webapp treats an unset time as midnight and returns the full day schedule. */
const DEFAULT_SEARCH_TIME = '00:00';

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
  // SDD 03 §6.3 in that repo) — treated as an alias for `destination` since there's no
  // dedicated stop-timetable view to jump to yet; this is the "acceptable" degraded target
  // that doc names explicitly.
  const params = useLocalSearchParams<{ origin?: string; destination?: string; stop?: string }>();
  const { isOnline, isPremium } = useNetwork();
  const canSearchOffline = useCanSearchOffline();
  const bootstrap = useBootstrap();
  const showMinibus = resolveEnabledModules(bootstrap.data?.island?.enabledModules).includes('minibus');
  const { visible: showHopOnOff } = useHopOnHopOffPromo();
  const { data: stops = [], isLoading: stopsLoading } = useStops();
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

  const runSearch = () => {
    if (!origin || !destination || !canSearchOffline) {
      return;
    }
    setSearchEnabled(true);
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

  const applySearch = (nextOrigin: string, nextDestination: string) => {
    setOrigin(nextOrigin);
    setDestination(nextDestination);
    setSearchEnabled(true);
  };

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
