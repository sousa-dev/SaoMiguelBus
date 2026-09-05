import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type MapView from 'react-native-maps';
import { Marker } from 'react-native-maps';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Bus,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CloudOff,
  List,
  Search,
  X,
} from 'lucide-react-native';

import type { AndroidOsmWebMapHandle } from '@/components/AndroidOsmWebMap';
import { Screen } from '@/components/Screen';
import { OsmMapView } from '@/components/OsmMapView';
import { IconButton } from '@/components/ui/IconButton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateView';
import { ScreenTopAdBanner } from '@/features/ads/components/ScreenTopAdBanner';
import { MinibusLineCard } from '@/features/minibus/components/MinibusLineCard';
import { MinibusLineImage } from '@/features/minibus/components/MinibusLineImage';
import { MinibusNetworkStopSheet } from '@/features/minibus/components/MinibusNetworkStopSheet';
import { useMinibusOffline } from '@/features/minibus/hooks/useMinibusOffline';
import { useMinibusLines, useMinibusNetwork } from '@/features/minibus/hooks/useMinibusQueries';
import { useOpenMinibusLiveTracking } from '@/features/minibus/hooks/useOpenMinibusLiveTracking';
import { trackMinibusView } from '@/features/minibus/lib/live-analytics';
import {
  liveNetworkMapStops,
  type MinibusLiveMapStopLine,
  type MinibusLiveMapStopPin,
} from '@/features/minibus/lib/liveNetworkMapStops';
import { getPdlMinibusMapRegion } from '@/features/minibus/lib/mapRegion';
import { MINIBUS_ACCENT } from '@/features/minibus/lib/moduleAccent';
import { localDocumentImageUri } from '@/features/minibus/offline';
import { buildMinibusDocumentFileUrl } from '@/features/minibus/pdfUrl';
import {
  CLUSTER_ABOVE_DELTA,
  clusterStops,
  type MapRegionLike,
} from '@/features/transit/lib/stop-clusters';
import { coordinateToRegion } from '@/lib/island-map';
import type { MapOverlaySpec } from '@/lib/map-overlays';
import { useNetwork } from '@/lib/network-provider';
import { MIN_QUERY_LENGTH, SEARCH_DEBOUNCE_MS, filterStops } from '@/lib/stop-search';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { Stop } from '@/lib/types';

/**
 * Orange pin palette — MiniBus's own accent, deliberately nothing like the
 * transit network map's blues. Base pin is the brand orange, merged clusters
 * go lighter, the focused pin goes red-orange so it still reads against the
 * base pins it sits among.
 */
const STOP_COLOR = MINIBUS_ACCENT;
const CLUSTER_COLOR = '#fb923c';
const FOCUS_COLOR = '#c2410c';

/**
 * Close enough that `clusterStops` stops clustering (`CLUSTER_ABOVE_DELTA`),
 * so a stop picked from the list resolves into its own pin instead of landing
 * the rider on a numbered blob.
 */
const FOCUS_DELTA = CLUSTER_ABOVE_DELTA / 3;

/** Fixed, so `getItemLayout` can carry `scrollToIndex` over the full list. */
const ROW_HEIGHT = 44;

/**
 * `clusterStops` speaks the transit `Stop` shape; the MiniBus pin rides along
 * so a cluster or focused pin resolves back to its lines without a second
 * lookup. Ids are the pin array index, which is deterministic (network line
 * order), so clustering never reshuffles between renders.
 */
type MinibusMapStop = Stop & { pin: MinibusLiveMapStopPin };

type NetworkTab = 'map' | 'lines';

/**
 * The MiniBus network, browsable: every stop on the map (orange pins, same
 * clustered-viewport approach as the transit network map) plus the line
 * catalog this screen inherited from the old hub "Lines" section.
 *
 * Map tab mirrors the transit network screen's interaction rule: the first
 * interaction with a stop FOCUSES it (list row flies, pin highlights), a
 * second on the same stop OPENS it — here into a sheet of the lines serving
 * it, each with a jump into the live map filtered to that line. There is no
 * per-stop arrivals feed for MiniBus, so the sheet shows served lines rather
 * than invented departures.
 */
export default function MinibusNetworkScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { isOnline } = useNetwork();
  const { openLiveTracking } = useOpenMinibusLiveTracking();

  const [tab, setTab] = useState<NetworkTab>('map');

  useFocusEffect(
    useCallback(() => {
      trackMinibusView('network');
    }, []),
  );

  const { snapshot } = useMinibusOffline();
  const linesQuery = useMinibusLines();
  const offlineNetwork = snapshot?.bundle?.network ?? null;
  const networkQuery = useMinibusNetwork(!offlineNetwork);
  const network = offlineNetwork ?? networkQuery.data ?? null;
  const lines = linesQuery.data?.lines ?? snapshot?.bundle?.lines ?? null;

  const networkMapLocalUri = localDocumentImageUri(snapshot, 'network-map');
  const networkMapRemoteUrl =
    snapshot?.bundle?.network_map?.url ?? buildMinibusDocumentFileUrl('network-map');

  const pins = useMemo(() => liveNetworkMapStops(network, lines ?? [], null), [network, lines]);

  const mapStops = useMemo(
    () =>
      pins
        .flatMap((pin, index) => {
          const { latitude, longitude } = pin.stop;
          if (typeof latitude !== 'number' || typeof longitude !== 'number') {
            return [];
          }
          return [{ id: index, name: pin.stop.name_pt, latitude, longitude, pin }];
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'pt')),
    [pins],
  );

  const [region, setRegion] = useState<MapRegionLike>(() => getPdlMinibusMapRegion());
  const clusters = useMemo(() => clusterStops(mapStops, region), [mapStops, region]);
  const zoomedIn = region.latitudeDelta <= CLUSTER_ABOVE_DELTA;

  const mapRef = useRef<MapView | AndroidOsmWebMapHandle | null>(null);
  const listRef = useRef<FlatList<MinibusMapStop> | null>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  // The stop the map is centred on, and the one an "open" gesture applies to.
  const [focusedStopKey, setFocusedStopKey] = useState<string | null>(null);
  const [selectedPin, setSelectedPin] = useState<MinibusLiveMapStopPin | null>(null);

  // Same debounce as the planner's pickers — refiltering per keystroke is
  // wasted work while the rider is still typing.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const searching = debouncedQuery.trim().length >= MIN_QUERY_LENGTH;

  /** What the list shows AND what the arrows step through — one sequence. */
  const listStops = useMemo(
    () => (searching ? filterStops(mapStops, debouncedQuery) : mapStops),
    [mapStops, debouncedQuery, searching],
  );

  const focusedStop = useMemo(
    () => mapStops.find((stop) => stop.pin.stop.key === focusedStopKey) ?? null,
    [mapStops, focusedStopKey],
  );
  const focusedIndex = focusedStop
    ? listStops.findIndex((stop) => stop.pin.stop.key === focusedStop.pin.stop.key)
    : -1;

  const openStop = (pin: MinibusLiveMapStopPin) => {
    Keyboard.dismiss();
    setSelectedPin(pin);
  };

  const focusStop = (stop: MinibusMapStop, options: { fly: boolean }) => {
    setFocusedStopKey(stop.pin.stop.key);
    if (!options.fly) {
      return;
    }
    const next = coordinateToRegion(
      { lat: stop.latitude, lng: stop.longitude },
      FOCUS_DELTA,
    );
    // Both the animation and the cluster recompute: `onRegionChangeComplete`
    // does fire after `animateToRegion`, but not until the flight ends, and
    // the pin should already be un-clustered when the rider arrives.
    setRegion(next);
    mapRef.current?.animateToRegion(next, 350);
  };

  /** A list row: fly to it, or open it if the map is already there. */
  const onStopRowPress = (stop: MinibusMapStop) => {
    if (focusedStopKey === stop.pin.stop.key) {
      openStop(stop.pin);
      return;
    }
    focusStop(stop, { fly: true });
  };

  /**
   * A pin: highlight it, or open it if it is already highlighted. Deliberately
   * does NOT fly — the rider tapped a pin they can already see.
   */
  const onPinPress = (stop: MinibusMapStop) => {
    if (focusedStopKey === stop.pin.stop.key) {
      openStop(stop.pin);
      return;
    }
    setPanelOpen(false);
    Keyboard.dismiss();
    focusStop(stop, { fly: false });
  };

  /** Walk the list, wrapping at both ends. */
  const step = (delta: 1 | -1) => {
    if (listStops.length === 0) {
      return;
    }
    const next =
      focusedIndex < 0
        ? delta > 0
          ? 0
          : listStops.length - 1
        : (focusedIndex + delta + listStops.length) % listStops.length;
    const target = listStops[next];
    focusStop(target, { fly: true });
    if (panelOpen) {
      const rowIndex = listStops.findIndex((stop) => stop.pin.stop.key === target.pin.stop.key);
      if (rowIndex >= 0) {
        listRef.current?.scrollToIndex({ index: rowIndex, animated: true, viewPosition: 0.5 });
      }
    }
  };

  const androidOverlays = useMemo(
    (): MapOverlaySpec => ({
      markers: clusters.map((cluster) => {
        const focused =
          cluster.stop != null &&
          (cluster.stop as MinibusMapStop).pin.stop.key === focusedStopKey;
        const isCluster = cluster.count > 1;
        return {
          id: cluster.id,
          latitude: cluster.latitude,
          longitude: cluster.longitude,
          pinColor: focused ? FOCUS_COLOR : isCluster ? CLUSTER_COLOR : STOP_COLOR,
          // A cluster keeps its count; a single stop gets the bus glyph, which
          // says "bus stop" without a caption at any size.
          ...(isCluster ? { label: String(cluster.count) } : { iconKind: 'bus' as const }),
          iconColor: '#ffffff',
          // Focused is drawn bigger AND haloed: colour alone does not pick one
          // pin out of a field of same-coloured pins.
          size: isCluster ? 28 : focused ? 34 : 22,
          highlighted: focused,
          title: cluster.stop?.name,
          ...(cluster.stop ? { onPress: () => onPinPress(cluster.stop as MinibusMapStop) } : {}),
        };
      }),
      polylines: [],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clusters, focusedStopKey],
  );

  const onViewLive = (line: MinibusLiveMapStopLine) => {
    setSelectedPin(null);
    void openLiveTracking({ source: 'network', lineSlug: line.slug, lineCode: line.code });
  };

  if (!isOnline) {
    return (
      <Screen withStackHeader>
        <ScreenTopAdBanner />
        <EmptyState icon={CloudOff} title={t('minibusMapOffline')} />
      </Screen>
    );
  }

  const networkLoading = !network && networkQuery.isLoading;
  const networkError = !network && networkQuery.isError;
  const linesLoading = linesQuery.isLoading && !lines;
  const linesError = linesQuery.isError && !lines;

  if (networkLoading || networkError) {
    return (
      <Screen withStackHeader>
        <ScreenTopAdBanner />
        {networkLoading ? <LoadingState /> : null}
        {networkError ? (
          <ErrorState
            title={t('minibusLoadError')}
            actionLabel={t('commonRetry')}
            onAction={() => void networkQuery.refetch()}
          />
        ) : null}
      </Screen>
    );
  }

  return (
    <Screen withStackHeader>
      <ScreenTopAdBanner />
      <View style={styles.container}>
        <View style={styles.tabsRow}>
          <SegmentedControl
            options={[
              { value: 'map', label: t('minibusMapTab') },
              { value: 'lines', label: t('minibusSectionLines') },
            ]}
            value={tab}
            onChange={setTab}
            accessibilityLabel={t('minibusNetworkMap')}
            activeColor={MINIBUS_ACCENT}
          />
        </View>

        {tab === 'map' ? (
          <View style={styles.fill}>
            <OsmMapView
              ref={mapRef}
              style={styles.fill}
              initialRegion={region}
              onRegionChangeComplete={setRegion}
              androidOverlays={androidOverlays}
              accessibilityLabel={t('minibusNetworkMapA11y')}
            >
              {Platform.OS === 'ios'
                ? clusters.map((cluster) =>
                    cluster.stop ? (
                      <Marker
                        key={cluster.id}
                        coordinate={{
                          latitude: cluster.latitude,
                          longitude: cluster.longitude,
                        }}
                        title={cluster.stop.name}
                        anchor={{ x: 0.5, y: 0.5 }}
                        onPress={() => onPinPress(cluster.stop as MinibusMapStop)}
                      >
                        <StopPin focused={(cluster.stop as MinibusMapStop).pin.stop.key === focusedStopKey} />
                      </Marker>
                    ) : (
                      <Marker
                        key={cluster.id}
                        coordinate={{
                          latitude: cluster.latitude,
                          longitude: cluster.longitude,
                        }}
                        anchor={{ x: 0.5, y: 0.5 }}
                      >
                        <View style={[styles.cluster, { backgroundColor: CLUSTER_COLOR }]}>
                          <Text style={styles.clusterLabel}>{cluster.count}</Text>
                        </View>
                      </Marker>
                    ),
                  )
                : null}
            </OsmMapView>

            {/* Floats over the map rather than splitting the screen: the map is
                what this tab is for, and the list is a way of driving it. */}
            <View style={styles.searchLayer} pointerEvents="box-none">
              <View
                style={[styles.searchField, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <Search size={18} color={theme.muted} />
                <TextInput
                  style={[styles.searchInput, { color: theme.text }]}
                  placeholder={t('minibusNetworkSearchPlaceholder')}
                  placeholderTextColor={theme.muted}
                  value={query}
                  onChangeText={(text) => {
                    setQuery(text);
                    setPanelOpen(true);
                  }}
                  onFocus={() => setPanelOpen(true)}
                  autoCorrect={false}
                  autoCapitalize="none"
                  autoComplete="off"
                  spellCheck={false}
                  returnKeyType="search"
                />
                {query.length > 0 ? (
                  <IconButton
                    icon={X}
                    size="sm"
                    variant="ghost"
                    color={theme.muted}
                    accessibilityLabel={t('close')}
                    onPress={() => {
                      setQuery('');
                      setDebouncedQuery('');
                    }}
                  />
                ) : null}
                {/* Opens the FULL list with nothing typed — browsing, not searching. */}
                <IconButton
                  icon={panelOpen ? ChevronUp : List}
                  size="sm"
                  variant="ghost"
                  color={MINIBUS_ACCENT}
                  accessibilityLabel={t('minibusNetworkShowList')}
                  accessibilityState={{ expanded: panelOpen }}
                  onPress={() => setPanelOpen((open) => !open)}
                />
              </View>

              {panelOpen ? (
                <View
                  style={[styles.results, { backgroundColor: theme.card, borderColor: theme.border }]}
                >
                  {listStops.length === 0 ? (
                    <Text style={[typography.caption, styles.noMatches, { color: theme.muted }]}>
                      {t('minibusNetworkNoMatches')}
                    </Text>
                  ) : (
                    <FlatList
                      ref={listRef}
                      data={listStops}
                      // Virtualised: the unfiltered list is every stop in the
                      // network, and mounting them all to scroll a handful is
                      // what makes this panel feel broken on older Androids.
                      keyExtractor={(stop) => stop.pin.stop.key}
                      getItemLayout={(_, index) => ({
                        length: ROW_HEIGHT,
                        offset: ROW_HEIGHT * index,
                        index,
                      })}
                      initialNumToRender={12}
                      windowSize={7}
                      keyboardShouldPersistTaps="handled"
                      nestedScrollEnabled
                      renderItem={({ item }) => {
                        const stop = item;
                        const focused = stop.pin.stop.key === focusedStopKey;
                        return (
                          <Pressable
                            onPress={() => onStopRowPress(stop)}
                            accessibilityRole="button"
                            accessibilityLabel={stop.name}
                            style={[
                              styles.resultRow,
                              focused ? { backgroundColor: theme.surfaceVariant } : null,
                            ]}
                          >
                            <Text
                              numberOfLines={1}
                              style={[
                                focused ? typography.bodyStrong : typography.body,
                                styles.resultName,
                                { color: theme.text },
                              ]}
                            >
                              {stop.name}
                            </Text>
                            {/* The affordance for the second tap — without it the
                                row gives no sign that tapping again does something
                                different from what the first tap did. */}
                            {focused ? (
                              <>
                                <Text style={[typography.caption, { color: MINIBUS_ACCENT }]}>
                                  {t('minibusNetworkOpenStop')}
                                </Text>
                                <ChevronRight size={16} color={MINIBUS_ACCENT} />
                              </>
                            ) : null}
                          </Pressable>
                        );
                      }}
                    />
                  )}
                </View>
              ) : null}
            </View>

            {focusedStop ? (
              <View style={[styles.focusBar, { backgroundColor: theme.card, borderColor: FOCUS_COLOR }]}>
                <IconButton
                  icon={ChevronLeft}
                  size="sm"
                  variant="ghost"
                  color={theme.text}
                  accessibilityLabel={t('minibusNetworkPreviousStop')}
                  onPress={() => step(-1)}
                />
                <Pressable
                  style={styles.focusBody}
                  onPress={() => openStop(focusedStop.pin)}
                  accessibilityRole="button"
                  accessibilityLabel={`${focusedStop.name} — ${t('minibusNetworkOpenStop')}`}
                >
                  <Text numberOfLines={1} style={[typography.bodyStrong, { color: theme.text }]}>
                    {focusedStop.name}
                  </Text>
                  <Text style={[typography.caption, { color: theme.muted }]}>
                    {focusedIndex >= 0
                      ? `${focusedIndex + 1}/${listStops.length} · ${t('minibusNetworkOpenStop')}`
                      : t('minibusNetworkOpenStop')}
                  </Text>
                </Pressable>
                <IconButton
                  icon={ChevronRight}
                  size="sm"
                  variant="ghost"
                  color={theme.text}
                  accessibilityLabel={t('minibusNetworkNextStop')}
                  onPress={() => step(1)}
                />
              </View>
            ) : (
              <View style={[styles.hint, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[typography.caption, { color: theme.muted }]}>
                  {zoomedIn
                    ? t('minibusNetworkTapStop', { count: mapStops.length })
                    : t('minibusNetworkZoomIn', { count: mapStops.length })}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <ScrollView
            style={styles.fill}
            contentContainerStyle={styles.linesContent}
            showsVerticalScrollIndicator={false}
          >
            {/* The hub's old "Lines" section, displaced by the embedded route
                planner — the schematic and the catalog live here now. */}
            <MinibusLineImage
              compact
              documentSlug="network-map"
              localUri={networkMapLocalUri}
              remoteUrl={networkMapRemoteUrl}
              sectionTitle={t('minibusNetworkMap')}
              accessibilityLabel={t('minibusNetworkMapImageAlt')}
              tapHintKey="minibusNetworkMapTapToZoom"
              fullscreenA11yKey="minibusNetworkMapOpenFullscreen"
            />

            {linesLoading ? (
              <View style={styles.skeletons}>
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </View>
            ) : null}

            {linesError ? (
              <ErrorState
                title={t('minibusLoadError')}
                actionLabel={t('commonRetry')}
                onAction={() => void linesQuery.refetch()}
              />
            ) : null}

            {!linesLoading && !linesError && lines ? (
              <View style={styles.lineList}>
                {lines.map((line) => (
                  <MinibusLineCard
                    key={line.slug}
                    line={line}
                    onPress={() => router.push(`/minibus/${line.slug}`)}
                  />
                ))}
              </View>
            ) : null}
          </ScrollView>
        )}
      </View>

      <MinibusNetworkStopSheet
        visible={selectedPin != null}
        pin={selectedPin}
        onClose={() => setSelectedPin(null)}
        onViewLive={onViewLive}
      />
    </Screen>
  );
}

/** iOS pin. Android draws its equivalent from `iconKind: 'bus'` in the WebView. */
function StopPin({ focused }: { focused: boolean }) {
  return (
    <View
      style={[
        styles.stopPin,
        {
          backgroundColor: focused ? FOCUS_COLOR : STOP_COLOR,
          width: focused ? 34 : 22,
          height: focused ? 34 : 22,
          borderRadius: focused ? 17 : 11,
          borderColor: focused ? '#111' : '#fff',
          borderWidth: focused ? 3 : 2,
        },
      ]}
    >
      <Bus size={focused ? 18 : 12} color="#fff" fill="#fff" strokeWidth={0} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabsRow: { paddingHorizontal: space.md },
  fill: { flex: 1 },
  cluster: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  clusterLabel: { color: '#fff', fontWeight: '800', fontSize: 12 },
  stopPin: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  searchLayer: {
    position: 'absolute',
    top: space.md,
    left: space.md,
    // Clear of the map's zoom controls, which sit top-right.
    right: 56,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.full,
    paddingLeft: space.md,
    paddingRight: space.xs,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 16 },
  results: {
    marginTop: space.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    overflow: 'hidden',
    // A bound, not a clip — every match stays reachable however many there are.
    maxHeight: 260,
  },
  noMatches: { padding: space.md, textAlign: 'center' },
  resultRow: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
  },
  resultName: { flex: 1 },
  focusBar: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    bottom: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: space.xs,
  },
  focusBody: { flex: 1, alignItems: 'center', paddingVertical: space.sm },
  hint: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    bottom: space.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    alignItems: 'center',
  },
  linesContent: { padding: space.md, paddingBottom: space.xl },
  skeletons: { gap: space.sm },
  lineList: { gap: space.md },
});
