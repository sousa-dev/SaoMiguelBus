import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { Chip } from '@/components/ui/Chip';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Activity } from 'lucide-react-native';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateView';
import { space } from '@/lib/tokens';
import { EarthquakeCard } from '@/features/earthquakes/components/EarthquakeCard';
import { FeltVoteSheet } from '@/features/earthquakes/components/FeltVoteSheet';
import { SeismicMap } from '@/features/earthquakes/components/SeismicMap';
import { useSeismicEvent, useSeismicEvents } from '@/features/earthquakes/hooks/useEarthquakeQueries';
import { track } from '@/lib/analytics';
import { useAppTheme } from '@/lib/theme';
import type { SeismicEvent } from '@/lib/types';

type ViewMode = 'map' | 'list';

const WINDOW_OPTIONS = [
  { hours: 24, labelKey: 'seismicWindow24h' as const },
  { hours: 72, labelKey: 'seismicWindow3d' as const },
  { hours: 168, labelKey: 'seismicWindow7d' as const },
  { hours: 720, labelKey: 'seismicWindow30d' as const },
];

export default function EarthquakesScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    focusLat?: string;
    focusLng?: string;
    focusId?: string;
  }>();
  const [windowHours, setWindowHours] = useState(24);
  const events = useSeismicEvents(windowHours);
  const hasMap = Platform.OS !== 'web';

  const [viewMode, setViewMode] = useState<ViewMode>(hasMap ? 'map' : 'list');
  const [selectedEvent, setSelectedEvent] = useState<SeismicEvent | null>(null);
  const [voteOpen, setVoteOpen] = useState(false);

  const focusEventId = params.focusId != null ? Number(params.focusId) : 0;
  const mapFocus = useMemo(() => {
    const lat = params.focusLat != null ? Number(params.focusLat) : NaN;
    const lng = params.focusLng != null ? Number(params.focusLng) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    return { lat, lng };
  }, [params.focusLat, params.focusLng]);

  const focusedEvent = useSeismicEvent(focusEventId, mapFocus != null && focusEventId > 0);

  useEffect(() => {
    if (mapFocus && hasMap) {
      setViewMode('map');
    }
  }, [mapFocus, hasMap]);

  useFocusEffect(
    useCallback(() => {
      void events.refetch();
      track('seismic', 'view', { screen: viewMode });
    }, [events.refetch, viewMode]),
  );

  const onRefresh = useCallback(() => {
    void events.refetch();
  }, [events.refetch]);

  const openDetail = (item: SeismicEvent) =>
    router.push({
      pathname: '/(tabs)/earthquakes/[id]',
      params: { id: String(item.id) },
    });

  const onMarkerPress = (item: SeismicEvent) => {
    setSelectedEvent(item);
    setVoteOpen(true);
    track('seismic', 'map_marker', { event_id: item.id, magnitude: item.magnitude });
  };

  const closeVote = () => {
    setVoteOpen(false);
    setSelectedEvent(null);
  };

  const eventList = useMemo(() => {
    const list = events.data ?? [];
    const extra = focusedEvent.data;
    if (!extra || list.some((e) => e.id === extra.id)) {
      return list;
    }
    return [extra, ...list];
  }, [events.data, focusedEvent.data]);

  return (
    <Screen withStackHeader>
      {hasMap ? (
        <View style={{ padding: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
          <SegmentedControl
            options={[
              { value: 'map' as ViewMode, label: t('seismicMapTab') },
              { value: 'list' as ViewMode, label: t('seismicListTab') },
            ]}
            value={viewMode}
            onChange={setViewMode}
          />
        </View>
      ) : null}

      <View style={[styles.windowRow, { borderBottomColor: theme.border }]}>
        {WINDOW_OPTIONS.map((opt) => (
          <Chip
            key={opt.hours}
            label={t(opt.labelKey)}
            selected={windowHours === opt.hours}
            onPress={() => {
              setWindowHours(opt.hours);
              track('seismic', 'filter', { window_hours: opt.hours });
            }}
          />
        ))}
      </View>

      {events.isLoading && viewMode === 'list' ? <LoadingState /> : null}
      {events.isError ? (
        <ErrorState
          title={t('seismicLoadError')}
          actionLabel={t('searchButton')}
          onAction={() => void events.refetch()}
        />
      ) : null}

      <View style={styles.fill}>
        {viewMode === 'map' && hasMap ? (
          <SeismicMap events={eventList} focus={mapFocus} onMarkerPress={onMarkerPress} />
        ) : (
          <FlatList
            data={eventList}
            keyExtractor={(item) => String(item.id)}
            refreshControl={
              <RefreshControl
                refreshing={events.isRefetching}
                onRefresh={onRefresh}
                tintColor={theme.primary}
              />
            }
            ListEmptyComponent={
              !events.isLoading ? (
                <EmptyState icon={Activity} title={t('seismicEmpty')} description={t('seismicMapEmptyHint')} />
              ) : null
            }
            renderItem={({ item }) => (
              <EarthquakeCard event={item} onPress={() => openDetail(item)} />
            )}
            contentContainerStyle={styles.list}
          />
        )}
      </View>

      {selectedEvent ? (
        <FeltVoteSheet
          visible={voteOpen}
          eventId={selectedEvent.id}
          event={selectedEvent}
          onClose={closeVote}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  list: { padding: 12, paddingBottom: 24 },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  toggleBtn: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 8,
  },
  toggleText: { fontWeight: '700', fontSize: 14 },
  windowRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  windowChip: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  windowChipText: { fontSize: 12, fontWeight: '700' },
});
