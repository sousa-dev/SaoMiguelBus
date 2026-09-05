import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { CachedBadge } from '@/components/ui/CachedBadge';
import { EmptyState } from '@/components/ui/StateView';
import { AdBanner } from '@/features/ads/components/AdBanner';
import { InterstitialOrchestrator } from '@/features/ads/components/InterstitialOrchestrator';
import { AdViewportProvider, useAdViewportSource } from '@/features/ads/lib/ad-viewport';
import { HopOnHopOffCtaRow } from '@/features/hop-on-hop-off/components/HopOnHopOffCtaRow';
import { useHopOnHopOffPromo } from '@/features/hop-on-hop-off/hooks/useHopOnHopOffPromo';
import { MinibusAttributionFooter } from '@/features/minibus/components/MinibusAttributionFooter';
import { MinibusJourneyResults } from '@/features/minibus/components/MinibusJourneyResults';
import { MinibusLiveHubCard } from '@/features/minibus/components/MinibusLiveHubCard';
import { MinibusNetworkMapLink } from '@/features/minibus/components/MinibusNetworkMapLink';
import { MinibusPlannerCard } from '@/features/minibus/components/MinibusPlannerCard';
import { MinibusPricesLink } from '@/features/minibus/components/MinibusPricesLink';
import { TransitMinibusLink } from '@/features/minibus/components/TransitMinibusLink';
import { minibusJourneyAnalyticsProps } from '@/features/minibus/lib/analytics-props';
import { trackMinibusView } from '@/features/minibus/lib/live-analytics';
import { MINIBUS_ACCENT } from '@/features/minibus/lib/moduleAccent';
import { setPendingDirections } from '@/features/minibus/directionsStore';
import { TransitWebShell } from '@/features/transit/components/TransitWebShell';
import { SearchingState } from '@/features/transit/components/SearchingState';
import { useMinibusOffline } from '@/features/minibus/hooks/useMinibusOffline';
import {
  useMinibusLines,
  useMinibusNetwork,
  useMinibusTariffs,
} from '@/features/minibus/hooks/useMinibusQueries';
import { useMinibusRouteSearch } from '@/features/minibus/hooks/useMinibusRouteSearch';
import { useOpenMinibusLiveTracking } from '@/features/minibus/hooks/useOpenMinibusLiveTracking';
import { useLiveVehicleCounts } from '@/features/live-tracking/hooks/useLiveVehicleCounts';
import { resolveLiveCount } from '@/features/live-tracking/lib/liveCounts';
import { isLiveEntryEnabled } from '@/features/live-tracking/lib/liveEntryVisibility';
import { useLiveTrackingDevStore } from '@/features/live-tracking/lib/live-tracking-dev-store';
import { useBootstrap } from '@/features/transit/hooks/useTransitQueries';
import { resolveEnabledModules } from '@/config/island';
import { track } from '@/lib/analytics';
import { useNetwork } from '@/lib/network-provider';
import { space } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

/**
 * The PDL MiniBus hub, mirroring the transit tab's structure: the route
 * planner lives directly on this page with results rendering inline under it,
 * the network map and live tracking share one row, and fares link out to
 * their own screen. The layout is shared with transit; the orange accents are
 * the one deliberate difference.
 */
export default function MinibusScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: bootstrap } = useBootstrap();
  const modules = resolveEnabledModules(bootstrap?.island?.enabledModules);
  const enabled = modules.includes('minibus');
  const showTransit = modules.includes('transit');
  const { visible: showHopOnOff } = useHopOnHopOffPromo();

  const [hubFocused, setHubFocused] = useState(false);

  const { isOnline } = useNetwork();
  // The hub's ONLY tracking-related request: a cached count, never a vendor
  // call by itself (see `GET /api/v3/transit/live-counts`). The live map
  // screen still probes health for real -- its polling is what keeps this
  // cache warm for everyone else.
  const liveCounts = useLiveVehicleCounts({ enabled: enabled && hubFocused });
  const minibusLive = resolveLiveCount(liveCounts.data?.minibus);
  // Always shown once the module itself is enabled -- an outage explains
  // itself on the live screen rather than making the entry disappear.
  const forceLiveTrackingUnavailable = useLiveTrackingDevStore((s) => s.forceUnavailable);
  const liveEntryEnabled =
    isLiveEntryEnabled(isOnline, minibusLive.available) && !forceLiveTrackingUnavailable;
  const { openLiveTracking } = useOpenMinibusLiveTracking();

  const { snapshot } = useMinibusOffline();
  const offlineNetwork = snapshot?.bundle?.network ?? null;
  const linesQuery = useMinibusLines(enabled);
  const networkQuery = useMinibusNetwork(enabled && !offlineNetwork);
  const tariffsQuery = useMinibusTariffs(enabled);
  const network = offlineNetwork ?? networkQuery.data ?? null;
  const lines = linesQuery.data?.lines ?? snapshot?.bundle?.lines ?? [];

  const linesByCode = useMemo(
    () => new Map(lines.map((line) => [line.code, line])),
    [lines],
  );

  // Total stops for the network-map row's subtitle, mirroring the transit
  // tab's "Mapa da Rede" stop count. Offline bundle wins when present, same
  // rule the planner's stop picker uses.
  const stopsCount = useMemo(() => {
    if (!network) {
      return undefined;
    }
    const seen = new Set<string>();
    for (const line of network.lines) {
      for (const stop of line.stops) {
        seen.add(stop.name_pt);
      }
    }
    return seen.size;
  }, [network]);

  const stops = useMemo(() => {
    if (!network) {
      return [];
    }
    const seen = new Set<string>();
    const names: string[] = [];
    for (const line of network.lines) {
      for (const stop of line.stops) {
        if (!seen.has(stop.name_pt)) {
          seen.add(stop.name_pt);
          names.push(stop.name_pt);
        }
      }
    }
    return names.sort((a, b) => a.localeCompare(b));
  }, [network]);

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [submitted, setSubmitted] = useState<{ origin: string; destination: string } | null>(null);
  const [interstitialTrigger, setInterstitialTrigger] = useState(0);
  const lastSearchTrackedRef = useRef<string | null>(null);

  const { result, isLoading, source } = useMinibusRouteSearch(
    network,
    submitted?.origin ?? '',
    submitted?.destination ?? '',
    Boolean(submitted),
  );

  /**
   * Roll the interstitial when a search STARTS, not when results land, so the
   * ad's planning overlaps the search and the results render underneath it.
   * Same pattern as the transit screen: the click marks the ref, the arrival
   * of results consumes it instead of rolling again, and results that arrive
   * with no mark (a later network load, a cache hit) roll on their own.
   */
  const interstitialRolledAtStartRef = useRef(false);

  const rollSearchInterstitial = () => {
    // A keyboard left up can sit above a native interstitial and cover its
    // close control.
    Keyboard.dismiss();
    interstitialRolledAtStartRef.current = true;
    setInterstitialTrigger((value) => value + 1);
  };

  useEffect(() => {
    if (!submitted || isLoading) {
      return;
    }
    if (interstitialRolledAtStartRef.current) {
      interstitialRolledAtStartRef.current = false;
      return;
    }
    setInterstitialTrigger((value) => value + 1);
  }, [submitted, isLoading]);

  useEffect(() => {
    if (!submitted || isLoading) {
      return;
    }
    const searchKey = `${submitted.origin}|${submitted.destination}`;
    if (lastSearchTrackedRef.current === searchKey) {
      return;
    }
    lastSearchTrackedRef.current = searchKey;
    track('minibus', 'search', {
      origin: submitted.origin,
      destination: submitted.destination,
      results_count: result?.journeys.length ?? 0,
      offline: source === 'offline',
      source: source ?? 'api',
    });
  }, [submitted, isLoading, result, source]);

  useFocusEffect(
    useCallback(() => {
      if (!enabled) {
        return;
      }
      setHubFocused(true);
      trackMinibusView('list');
      void linesQuery.refetch();
      return () => {
        setHubFocused(false);
      };
    }, [enabled, linesQuery.refetch]),
  );

  useEffect(() => {
    if (!enabled) {
      router.replace('/transit');
    }
  }, [enabled, router]);

  const onRefresh = useCallback(() => {
    void linesQuery.refetch();
    void tariffsQuery.refetch();
  }, [linesQuery.refetch, tariffsQuery.refetch]);

  const onSwap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const onSearch = () => {
    const trimmedOrigin = origin.trim();
    const trimmedDestination = destination.trim();
    if (!trimmedOrigin || !trimmedDestination) {
      return;
    }
    // Rotate the top banner on each new search (the transit tab does the same).
    void queryClient.invalidateQueries({ queryKey: ['ad', 'home'] });
    rollSearchInterstitial();
    setSubmitted({ origin: trimmedOrigin, destination: trimmedDestination });
  };

  const journeys = result?.journeys ?? [];
  const hasSearched = Boolean(submitted);
  const hasResults = journeys.length > 0;
  const showEmpty = hasSearched && !isLoading && journeys.length === 0;
  const showInstructions = !hasSearched;

  // Lets the inline native ad slots below the fold hold off requesting an ad
  // until the rider actually scrolls towards them.
  const adViewport = useAdViewportSource();

  const sourceUrl = linesQuery.data?.source_url ?? snapshot?.bundle?.source_url ?? null;
  const importedAt = linesQuery.data?.imported_at ?? snapshot?.bundle?.imported_at ?? null;

  return (
    <Screen withStackHeader>
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScroll={adViewport.onScroll}
        scrollEventThrottle={adViewport.scrollEventThrottle}
        refreshControl={
          <RefreshControl
            refreshing={linesQuery.isFetching || tariffsQuery.isFetching}
            onRefresh={onRefresh}
            tintColor={MINIBUS_ACCENT}
          />
        }
      >
        <TransitWebShell>
          <AdBanner on="home" slot="top" />

          {/* Network map and "Ao vivo" share one row to keep the hub short:
              the map answers "where does this network go", live answers "where
              are the buses now". Each half stretches to fill when the other is
              absent. No margin — TransitWebShell's column gap spaces it. */}
          <View style={styles.mapLiveRow}>
            <View style={styles.mapLiveCell}>
              <MinibusNetworkMapLink stopsCount={stopsCount} />
            </View>
            <View style={styles.mapLiveCell}>
              <MinibusLiveHubCard
                enabled={liveEntryEnabled}
                isOnline={isOnline}
                vehicleCount={minibusLive.count}
                isLoading={liveCounts.isLoading}
                onPress={() => {
                  void openLiveTracking({ source: 'hub' });
                }}
              />
            </View>
          </View>

          <MinibusPlannerCard
            origin={origin}
            destination={destination}
            stops={stops}
            searching={hasSearched && isLoading}
            onOriginChange={setOrigin}
            onDestinationChange={setDestination}
            onSwap={onSwap}
            onSearch={onSearch}
          />

          {source === 'offline' && journeys.length > 0 ? (
            <CachedBadge label={t('minibusOfflineResults')} />
          ) : null}

          {isLoading ? <SearchingState variant="journeys" /> : null}

          {showEmpty ? (
            <EmptyState title={t('minibusNoJourneys')} description={t('minibusNoJourneysHint')} />
          ) : null}

          {/* A results view always carries one native ad. With no journeys to
              interleave it with, it sits under the empty state. */}
          {showEmpty ? <AdBanner on="home" slot="inline-end" format="native" /> : null}

          {hasResults ? (
            <AdViewportProvider value={adViewport.value}>
              <MinibusJourneyResults
                journeys={journeys}
                linesByCode={linesByCode}
                onJourneyPress={(journey, journeyIndex) => {
                  track('minibus', 'engage', {
                    action: 'select_journey',
                    ...minibusJourneyAnalyticsProps(journey, {
                      journey_index: journeyIndex,
                      offline: source === 'offline',
                    }),
                  });
                  setPendingDirections(journey, linesByCode);
                  router.push('/minibus/directions');
                }}
              />
            </AdViewportProvider>
          ) : null}

          {/* The "no search yet" area, in the transit tab's order: fares link,
              the AzoresBus cross-link, the hop-on-hop-off promo (tourists
              only), and a native ad. */}
          {showInstructions ? <MinibusPricesLink /> : null}

          {showInstructions && showTransit ? <TransitMinibusLink /> : null}

          {showInstructions && showHopOnOff ? (
            <HopOnHopOffCtaRow source="minibus" />
          ) : null}

          {showInstructions ? (
            <AdBanner on="home" slot="instructions" format="native" />
          ) : null}

          <MinibusAttributionFooter sourceUrl={sourceUrl} importedAt={importedAt} />
        </TransitWebShell>
      </ScrollView>
      {/* `ready` deliberately does not wait for the search — see rollSearchInterstitial. */}
      <InterstitialOrchestrator trigger={interstitialTrigger} ready={hasSearched} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: space.md,
    paddingBottom: space['4xl'],
    alignItems: 'center',
  },
  mapLiveRow: {
    flexDirection: 'row',
    gap: space.sm,
    alignSelf: 'stretch',
  },
  mapLiveCell: { flex: 1 },
});
