import React, { useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { EarthquakeCard } from '@/features/earthquakes/components/EarthquakeCard';
import { useSeismicEvents } from '@/features/earthquakes/hooks/useEarthquakeQueries';
import { track } from '@/lib/analytics';
import { useAppTheme } from '@/lib/theme';

export default function EarthquakesScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const events = useSeismicEvents();

  useFocusEffect(
    useCallback(() => {
      void events.refetch();
      track('seismic', 'view', { screen: 'list' });
    }, [events.refetch]),
  );

  const onRefresh = useCallback(() => {
    void events.refetch();
  }, [events.refetch]);

  return (
    <Screen withStackHeader>
      {events.isLoading ? <ActivityIndicator color={theme.primary} /> : null}
      {events.isError ? (
        <Text style={{ color: theme.muted }}>{t('seismicLoadError')}</Text>
      ) : null}

      <FlatList
        data={events.data ?? []}
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
            onPress={() =>
              router.push({
                pathname: '/(tabs)/earthquakes/[id]',
                params: { id: String(item.id) },
              })
            }
          />
        )}
        contentContainerStyle={styles.list}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 12, paddingBottom: 24 },
});
