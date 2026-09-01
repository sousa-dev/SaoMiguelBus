import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

import { SearchField } from '@/components/ui/SearchField';
import { Sheet } from '@/components/ui/Sheet';
import { AzoresbusStopArrivals } from '@/features/azoresbus/components/AzoresbusStopArrivals';
import { useAzoresbusStopArrivals } from '@/features/azoresbus/hooks/useAzoresbusStopArrivals';
import { useTrackArrivalsOnce } from '@/features/azoresbus/hooks/useTrackArrivalsOnce';
import {
  trackLiveSelectStop,
  trackLiveStopSearch,
} from '@/features/azoresbus/lib/live-analytics';
import { StopAreaRow, StopRow } from '@/features/transit/components/StopSectionRow';
import { flattenStopEntries } from '@/lib/stop-section-rows';
import { SEARCH_DEBOUNCE_MS, buildStopEntries } from '@/lib/stop-search';
import { radius, space, typography } from '@/lib/tokens';
import type { Stop } from '@/lib/types';
import { useAppTheme } from '@/lib/theme';

type Props = {
  visible: boolean;
  stops: Stop[];
  onClose: () => void;
  /** Opens the full stop page, with its timetable. */
  onOpenStop: (stopId: number) => void;
  /** Focuses one of the inbound buses on the map behind the sheet. */
  onSelectVehicle?: (vehicleId: string) => void;
};

/** Fixed so `getItemLayout` can carry the list over 800+ rows. */
const ROW_HEIGHT = 52;
const BODY_HEIGHT = 380;

/**
 * Search any stop, then see the buses heading there.
 *
 * Two panes in one sheet rather than two sheets: picking a stop is a step
 * towards the answer, not a destination, and pushing a second sheet over the
 * first would make going back to try another stop a two-tap affair.
 */
export function AzoresbusStopSearchSheet({
  visible,
  stops,
  onClose,
  onOpenStop,
  onSelectVehicle,
}: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  // Constant for a given screen, never a function of the result count. Capped
  // so a short screen (or landscape) cannot push the sheet past its own limit.
  const { height: windowHeight } = useWindowDimensions();
  const bodyHeight = Math.min(BODY_HEIGHT, Math.round(windowHeight * 0.45));
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [picked, setPicked] = useState<Stop | null>(null);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // Reset on close so reopening starts fresh rather than on the last answer.
  useEffect(() => {
    if (!visible) {
      setQuery('');
      setDebounced('');
      setPicked(null);
      setCollapsed(new Set());
    }
  }, [visible]);

  const arrivals = useAzoresbusStopArrivals(picked?.id ?? null, {
    enabled: visible && picked != null,
    screenActive: visible && picked != null,
  });
  useTrackArrivalsOnce('stop_search', picked?.id ?? null, arrivals.data?.arrivals);

  const pickStop = (stop: Stop) => {
    setPicked(stop);
    trackLiveSelectStop('stop_search', { stop: String(stop.id) });
    trackLiveStopSearch('select', { stop: String(stop.id) });
  };

  /**
   * Village sections while searching -- the same grouping the journey planner's
   * pickers use, via the same `buildStopEntries`, so "Capelas" reads the same
   * way wherever a rider types it.
   *
   * With an empty box that function yields nothing (it has a minimum query
   * length), which would read as "no stops exist". Fall back to the plain
   * alphabetical list there: an unfiltered 816-row list of collapsed villages
   * is a worse starting point than the stops themselves.
   */
  const rows = useMemo(() => {
    if (debounced.trim().length === 0) {
      return [...stops]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((stop) => ({ kind: 'stop' as const, stop, indented: false }));
    }
    return flattenStopEntries(buildStopEntries(stops, debounced), collapsed);
  }, [collapsed, debounced, stops]);

  const toggleArea = (key: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={picked ? picked.name : t('azoresbusLiveStopSearchTitle')}
      scrollable={false}
    >
      <View style={[styles.body, { height: bodyHeight }]}>
      {picked ? (
        <View style={styles.pane}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setPicked(null)}
            style={styles.back}
          >
            <ChevronLeft size={16} color={theme.primary} />
            <Text style={[typography.label, { color: theme.primary }]}>
              {t('azoresbusLiveStopSearchBack')}
            </Text>
          </Pressable>

          <ScrollView style={styles.paneScroll} keyboardShouldPersistTaps="handled">
            <AzoresbusStopArrivals
              arrivals={arrivals.data?.arrivals}
              isLoading={arrivals.isLoading}
              isError={arrivals.isError}
              updatedAt={arrivals.dataUpdatedAt}
              isRefetching={arrivals.isRefetching}
              onSelectVehicle={onSelectVehicle}
            />
          </ScrollView>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              trackLiveStopSearch('open_stop', { stop: String(picked.id) });
              onOpenStop(picked.id);
            }}
            style={[styles.openStop, { borderColor: theme.border }]}
          >
            <Text style={[typography.label, { color: theme.primary }]}>
              {t('azoresbusLiveStopOpen')}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.pane}>
          <SearchField
            value={query}
            onChangeText={setQuery}
            placeholder={t('azoresbusLiveStopSearchPlaceholder')}
            onClear={() => setQuery('')}
          />
          <FlatList
            data={rows}
            style={styles.list}
            keyExtractor={(row) =>
              row.kind === 'area' ? `area:${row.key}` : `stop:${row.stop.id}`
            }
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            initialNumToRender={12}
            windowSize={7}
            getItemLayout={(_data, index) => ({
              length: ROW_HEIGHT,
              offset: ROW_HEIGHT * index,
              index,
            })}
            ListEmptyComponent={
              <Text style={[typography.caption, styles.empty, { color: theme.muted }]}>
                {t('azoresbusLiveStopSearchNoMatch')}
              </Text>
            }
            renderItem={({ item }) =>
              item.kind === 'area' ? (
                <StopAreaRow
                  label={item.key}
                  count={item.count}
                  collapsed={item.collapsed}
                  height={ROW_HEIGHT}
                  onToggle={() => toggleArea(item.key)}
                />
              ) : (
                <StopRow
                  name={item.stop.name}
                  indented={item.indented}
                  height={ROW_HEIGHT}
                  onPress={() => pickStop(item.stop)}
                />
              )
            }
          />
        </View>
      )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  /**
   * A FIXED height, not a max -- supplied by the component so it can be capped
   * to the screen.
   *
   * With `maxHeight` the sheet resized on every keystroke as the result count
   * changed, and collapsed to almost nothing when a query matched no stops,
   * which reads as the sheet closing itself. A constant body means the list
   * scrolls underneath a still frame, so the search box never moves under the
   * user's thumb.
   */
  body: {},
  pane: { flex: 1 },
  paneScroll: { flex: 1 },
  list: { flex: 1 },
  empty: { paddingVertical: space.lg, textAlign: 'center' },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: space.sm,
  },
  openStop: {
    marginTop: space.md,
    paddingVertical: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
});
