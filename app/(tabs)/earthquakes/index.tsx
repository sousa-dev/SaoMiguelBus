import React, { useCallback, useState } from 'react';
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
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { EarthquakeCard } from '@/features/earthquakes/components/EarthquakeCard';
import { FeltVoteSheet } from '@/features/earthquakes/components/FeltVoteSheet';
import { SeismicMap } from '@/features/earthquakes/components/SeismicMap';
import { useSeismicEvents } from '@/features/earthquakes/hooks/useEarthquakeQueries';
import { track } from '@/lib/analytics';
import { useAppTheme } from '@/lib/theme';
import type { SeismicEvent } from '@/lib/types';

type ViewMode = 'map' | 'list';

export default function EarthquakesScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const events = useSeismicEvents();
  const hasMap = Platform.OS !== 'web';

  const [viewMode, setViewMode] = useState<ViewMode>(hasMap ? 'map' : 'list');
  const [selectedEvent, setSelectedEvent] = useState<SeismicEvent | null>(null);
  const [voteOpen, setVoteOpen] = useState(false);

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

  const eventList = events.data ?? [];

  return (
    <Screen withStackHeader>
      {hasMap ? (
        <View style={[styles.toggleRow, { borderBottomColor: theme.border }]}>
          <Pressable
            onPress={() => setViewMode('map')}
            style={[
              styles.toggleBtn,
              viewMode === 'map' && { backgroundColor: theme.primary },
            ]}
          >
            <Text
              style={[
                styles.toggleText,
                { color: viewMode === 'map' ? '#fff' : theme.text },
              ]}
            >
              {t('seismicMapTab')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setViewMode('list')}
            style={[
              styles.toggleBtn,
              viewMode === 'list' && { backgroundColor: theme.primary },
            ]}
          >
            <Text
              style={[
                styles.toggleText,
                { color: viewMode === 'list' ? '#fff' : theme.text },
              ]}
            >
              {t('seismicListTab')}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {events.isLoading ? <ActivityIndicator color={theme.primary} /> : null}
      {events.isError ? (
        <Text style={{ color: theme.muted, padding: 12 }}>{t('seismicLoadError')}</Text>
      ) : null}

      <View style={styles.fill}>
        {viewMode === 'map' && hasMap ? (
          <SeismicMap events={eventList} onMarkerPress={onMarkerPress} />
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
                <Text style={{ color: theme.muted, textAlign: 'center', marginTop: 24 }}>
                  {t('seismicEmpty')}
                </Text>
              ) : null
            }
            renderItem={({ item }) => (
              <EarthquakeCard
                event={item}
                theme={theme}
                onPress={() => openDetail(item)}
              />
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
          theme={theme}
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
});
