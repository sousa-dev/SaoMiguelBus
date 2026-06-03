import React, { useCallback, useState } from 'react';
import { Footprints } from 'lucide-react-native';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateView';
import { space } from '@/lib/tokens';
import { TrailCard } from '@/features/trails/components/TrailCard';
import { TrailFilters } from '@/features/trails/components/TrailFilters';
import { trackTrailFilter, useTrails, type TrailListFilters } from '@/features/trails/hooks/useTrailQueries';
import { staticIslandConfig } from '@/config/island';
import { useBootstrap } from '@/features/transit/hooks/useTransitQueries';
import { track } from '@/lib/analytics';
import { useAppTheme } from '@/lib/theme';

const EMPTY_FILTERS: TrailListFilters = {};

export default function TrailsScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { data: bootstrap } = useBootstrap();
  const modules = bootstrap?.island?.enabledModules ?? staticIslandConfig.enabledModules;
  const showTrails = modules.includes('trails');
  const [filters, setFilters] = useState<TrailListFilters>(EMPTY_FILTERS);
  const trails = useTrails(filters, showTrails);

  useFocusEffect(
    useCallback(() => {
      if (!showTrails) {
        return;
      }
      void trails.refetch();
      track('trails', 'view', { screen: 'list' });
    }, [showTrails, trails.refetch]),
  );

  const onRefresh = useCallback(() => {
    void trails.refetch();
  }, [trails.refetch]);

  const onClearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    trackTrailFilter(EMPTY_FILTERS);
  }, []);

  if (!showTrails) {
    return null;
  }

  const listHeader = (
    <TrailFilters filters={filters} onChange={setFilters} onClear={onClearFilters} />
  );

  return (
    <Screen withStackHeader>
      {trails.isError ? (
        <ErrorState
          title={t('trailsLoadError')}
          actionLabel={t('trailsRetry')}
          onAction={() => void trails.refetch()}
        />
      ) : null}

      <FlatList
        data={trails.isLoading ? [] : (trails.data?.trails ?? [])}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={listHeader}
        refreshControl={
          <RefreshControl
            refreshing={trails.isRefetching && !trails.isLoading}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          trails.isLoading ? (
            <View style={styles.skeletons}>
              <CardSkeleton />
              <CardSkeleton />
            </View>
          ) : !trails.isError ? (
            <EmptyState icon={Footprints} title={t('trailsEmpty')} />
          ) : null
        }
        ListFooterComponent={
          trails.data?.attribution ? (
            <Text style={[styles.attribution, { color: theme.muted }]}>{trails.data.attribution}</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <TrailCard
            trail={item}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/trails/[id]',
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
  list: { paddingHorizontal: space.lg, paddingBottom: space['2xl'] },
  skeletons: { gap: space.md, paddingTop: space.sm },
  attribution: { fontSize: 11, lineHeight: 16, marginTop: space.sm },
});
