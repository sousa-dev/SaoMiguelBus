import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type MapView from 'react-native-maps';
import { Marker } from 'react-native-maps';
import { useRouter } from 'expo-router';
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
import { EmptyState, LoadingState } from '@/components/ui/StateView';
import { useStops } from '@/features/transit/hooks/useTransitQueries';
import {
  CLUSTER_ABOVE_DELTA,
  clusterStops,
  type MapRegionLike,
} from '@/features/transit/lib/stop-clusters';
import { coordinateToRegion, getIslandMapRegion } from '@/lib/island-map';
import type { MapOverlaySpec } from '@/lib/map-overlays';
import { useNetwork } from '@/lib/network-provider';
import {
  MIN_QUERY_LENGTH,
  SEARCH_DEBOUNCE_MS,
  buildStopEntries,
} from '@/lib/stop-search';
import {
  flattenStopEntries,
  rowIndexOfStop,
  stopsOfRows,
  type StopSectionRow,
} from '@/lib/stop-section-rows';
import { StopAreaRow, StopRow } from '@/features/transit/components/StopSectionRow';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { Stop } from '@/lib/types';

const STOP_COLOR = '#0d47a1';
const CLUSTER_COLOR = '#1e88e5';
const FOCUS_COLOR = '#e65100';

/**
 * Close enough that `clusterStops` stops clustering (`CLUSTER_ABOVE_DELTA`), so
 * a stop picked from the list resolves into its own pin instead of landing the
 * rider on a numbered blob.
 */
const FOCUS_DELTA = CLUSTER_ABOVE_DELTA / 3;

/** Fixed, so `getItemLayout` can carry `scrollToIndex` over 800+ rows. */
const ROW_HEIGHT = 44;

/**
 * Every stop on the island, browsable.
 *
 * Clustered by viewport rather than drawn all at once: 816 stops is far past
 * what the Android Leaflet WebView renders smoothly, and at island zoom they
 * would be an unreadable blob anyway. Zoom in and clusters resolve into stops.
 *
 * Three ways to reach one stop, all driving the same `focusedStopId`: search
 * it, step through the list with the arrows, or tap its pin. And one rule
 * across all three — the first interaction FOCUSES, a second on the same stop
 * OPENS it. Riders come to this screen to find out where something is far more
 * often than to read its departures, so the map answers first and leaving the
 * screen is always deliberate.
 */
export default function TransitNetworkScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { isOnline } = useNetwork();
  const { data: stops = [], isLoading } = useStops();

  const [region, setRegion] = useState<MapRegionLike>(() => getIslandMapRegion());

  // The picker list carries each stop twice (full name + short-name alias)
  // reusing one id, so dedupe before counting or the map draws doubles.
  const unique = useMemo(() => {
    const seen = new Set<number>();
    return stops.filter((stop) => {
      if (seen.has(stop.id)) {
        return false;
      }
      seen.add(stop.id);
      return true;
    });
  }, [stops]);

  const clusters = useMemo(() => clusterStops(unique, region), [unique, region]);
  const zoomedIn = region.latitudeDelta <= CLUSTER_ABOVE_DELTA;

  const openStop = (stopId: number) =>
    router.push({
      pathname: '/(tabs)/transit/stop/[stopId]',
      params: { stopId: String(stopId) },
    });

  const mapRef = useRef<MapView | AndroidOsmWebMapHandle | null>(null);
  const listRef = useRef<FlatList<StopSectionRow<Stop>> | null>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  // The stop the map is centred on, and the one an "open" gesture applies to.
  const [focusedStopId, setFocusedStopId] = useState<number | null>(null);
  const [collapsedAreas, setCollapsedAreas] = useState<ReadonlySet<string>>(new Set());

  // Same debounce as the planner's pickers: on an 816-stop network a two-letter
  // prefix matches hundreds of rows, and refiltering per keystroke is wasted.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // Searched against the DEDUPED list: the raw stops carry each stop twice
  // (full name + short alias) under one id, which here would be two rows that
  // fly the map to the same pin.
  const searching = debouncedQuery.trim().length >= MIN_QUERY_LENGTH;

  const allSorted = useMemo(
    () => [...unique].sort((a, b) => a.name.localeCompare(b.name)),
    [unique],
  );

  /**
   * Village sections while searching, via the same `buildStopEntries` the
   * journey planner's pickers use — typing "Capelas" should read the same here
   * as it does there. Unfiltered stays a plain alphabetical list: 800 rows
   * collapsed into villages is a worse starting point than the stops.
   */
  const rows = useMemo((): StopSectionRow<Stop>[] => {
    if (!searching) {
      return allSorted.map((stop) => ({ kind: 'stop', stop, indented: false }));
    }
    return flattenStopEntries(buildStopEntries(unique, debouncedQuery), collapsedAreas);
  }, [allSorted, collapsedAreas, debouncedQuery, searching, unique]);

  /**
   * What the list shows AND what the arrows step through — the same sequence,
   * so "next" always means the row below the one highlighted. Derived FROM the
   * rendered rows, so a collapsed section is skipped by the arrows too.
   */
  const listStops = useMemo(() => stopsOfRows(rows), [rows]);

  const toggleArea = (key: string) =>
    setCollapsedAreas((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  const focusedStop = useMemo(
    () => unique.find((stop) => stop.id === focusedStopId) ?? null,
    [unique, focusedStopId],
  );
  const focusedIndex = focusedStop
    ? listStops.findIndex((stop) => stop.id === focusedStop.id)
    : -1;

  const focusStop = (stop: Stop, options: { fly: boolean }) => {
    setFocusedStopId(stop.id);
    if (!options.fly) {
      return;
    }
    const next = coordinateToRegion({ lat: stop.latitude, lng: stop.longitude }, FOCUS_DELTA);
    // Both the animation and the cluster recompute: `onRegionChangeComplete`
    // does fire after `animateToRegion`, but not until the flight ends, and
    // the pin should already be un-clustered when the rider arrives.
    setRegion(next);
    mapRef.current?.animateToRegion(next, 350);
  };

  /** A list row: fly to it, or open it if the map is already there. */
  const onStopRowPress = (stop: Stop) => {
    if (focusedStopId === stop.id) {
      openStop(stop.id);
      return;
    }
    focusStop(stop, { fly: true });
  };

  /**
   * A pin: highlight it, or open it if it is already highlighted.
   *
   * Deliberately does NOT fly. The rider tapped a pin they can already see, so
   * moving the map under their finger would only cost them the surroundings
   * they were using to identify it.
   */
  const onPinPress = (stop: Stop) => {
    if (focusedStopId === stop.id) {
      openStop(stop.id);
      return;
    }
    setPanelOpen(false);
    Keyboard.dismiss();
    focusStop(stop, { fly: false });
  };

  /**
   * Walk the list, wrapping at both ends — the point is to be able to keep
   * pressing without having to notice where the sequence stops.
   */
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
      // The ROW index, not the stop index: every section header above the stop
      // shifts it down by one, so stepping would land short without this.
      const rowIndex = rowIndexOfStop(rows, (stop) => stop.id === target.id);
      if (rowIndex >= 0) {
        listRef.current?.scrollToIndex({ index: rowIndex, animated: true, viewPosition: 0.5 });
      }
    }
  };

  const androidOverlays = useMemo(
    (): MapOverlaySpec => ({
      markers: clusters.map((cluster) => {
        const focused = cluster.stop != null && cluster.stop.id === focusedStopId;
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
          // Focused is drawn bigger AND haloed: on a map that is mostly pins,
          // colour alone is not enough to pick one out.
          size: isCluster ? 28 : focused ? 34 : 22,
          highlighted: focused,
          title: cluster.stop?.name,
          ...(cluster.stop ? { onPress: () => onPinPress(cluster.stop!) } : {}),
        };
      }),
      polylines: [],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clusters, focusedStopId],
  );

  if (!isOnline) {
    return (
      <Screen withStackHeader>
        <EmptyState icon={CloudOff} title={t('transitMapOffline')} />
      </Screen>
    );
  }
  if (isLoading) {
    return (
      <Screen withStackHeader>
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen withStackHeader>
      <View style={styles.fill}>
        <OsmMapView
          ref={mapRef}
          style={styles.fill}
          initialRegion={region}
          onRegionChangeComplete={setRegion}
          androidOverlays={androidOverlays}
          accessibilityLabel={t('transitNetworkMapA11y')}
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
                    onPress={() => onPinPress(cluster.stop!)}
                  >
                    <BusPin focused={cluster.stop.id === focusedStopId} />
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
            what this screen is for, and the list is a way of driving it. */}
        <View style={styles.searchLayer} pointerEvents="box-none">
          <View
            style={[styles.searchField, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Search size={18} color={theme.muted} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder={t('transitNetworkSearchPlaceholder')}
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
              color={theme.primary}
              accessibilityLabel={t('transitNetworkShowList')}
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
                  {t('transitNetworkNoMatches')}
                </Text>
              ) : (
                <FlatList
                  ref={listRef}
                  data={rows}
                  // Virtualised: the unfiltered list is every stop on the
                  // island, and mounting 800+ rows to scroll a handful is what
                  // makes this panel feel broken on older Androids.
                  // Keyed on the NAME for stops: the legacy list carries each
                  // stop twice (full name + short alias) reusing one id, so the
                  // id is not unique here but the name is by construction.
                  keyExtractor={(row) =>
                    row.kind === 'area' ? `area:${row.key}` : `stop:${row.stop.name}`
                  }
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
                    if (item.kind === 'area') {
                      return (
                        <StopAreaRow
                          label={item.key}
                          count={item.count}
                          collapsed={item.collapsed}
                          height={ROW_HEIGHT}
                          onToggle={() => toggleArea(item.key)}
                        />
                      );
                    }
                    const stop = item.stop;
                    const focused = stop.id === focusedStopId;
                    return (
                      <Pressable
                        onPress={() => onStopRowPress(stop)}
                        accessibilityRole="button"
                        accessibilityLabel={stop.name}
                        style={[
                          styles.resultRow,
                          item.indented ? styles.resultRowIndented : null,
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
                            <Text style={[typography.caption, { color: theme.primary }]}>
                              {t('transitNetworkOpenStop')}
                            </Text>
                            <ChevronRight size={16} color={theme.primary} />
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
              accessibilityLabel={t('transitNetworkPreviousStop')}
              onPress={() => step(-1)}
            />
            <Pressable
              style={styles.focusBody}
              onPress={() => openStop(focusedStop.id)}
              accessibilityRole="button"
              accessibilityLabel={`${focusedStop.name} — ${t('transitNetworkOpenStop')}`}
            >
              <Text numberOfLines={1} style={[typography.bodyStrong, { color: theme.text }]}>
                {focusedStop.name}
              </Text>
              <Text style={[typography.caption, { color: theme.muted }]}>
                {focusedIndex >= 0
                  ? `${focusedIndex + 1}/${listStops.length} · ${t('transitNetworkOpenStop')}`
                  : t('transitNetworkOpenStop')}
              </Text>
            </Pressable>
            <IconButton
              icon={ChevronRight}
              size="sm"
              variant="ghost"
              color={theme.text}
              accessibilityLabel={t('transitNetworkNextStop')}
              onPress={() => step(1)}
            />
          </View>
        ) : (
          <View style={[styles.hint, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[typography.caption, { color: theme.muted }]}>
              {zoomedIn
                ? t('transitNetworkTapStop', { count: unique.length })
                : t('transitNetworkZoomIn', { count: unique.length })}
            </Text>
          </View>
        )}
      </View>
    </Screen>
  );
}

/** iOS pin. Android draws its equivalent from `iconKind: 'bus'` in the WebView. */
function BusPin({ focused }: { focused: boolean }) {
  return (
    <View
      style={[
        styles.busPin,
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
  busPin: {
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
  /** Members sit under their village header, so the grouping survives a scroll. */
  resultRowIndented: { paddingLeft: space['2xl'] },
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
});
