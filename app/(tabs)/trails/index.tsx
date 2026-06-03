import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Footprints } from 'lucide-react-native';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateView';
import { space } from '@/lib/tokens';
import { TrailCard } from '@/features/trails/components/TrailCard';
import { TrailsToolbar, type TrailsViewMode } from '@/features/trails/components/TrailsToolbar';
import { filterTrailsByQuery } from '@/features/trails/filterHelpers';
import { trackTrailFilter, useTrails, type TrailListFilters } from '@/features/trails/hooks/useTrailQueries';
import { prefetchTrailImages } from '@/features/trails/trailImageCache';
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
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<TrailsViewMode>('list');
  const trails = useTrails(filters, showTrails);
  const trailItems = trails.data?.trails;

  const visibleTrails = useMemo(
    () => filterTrailsByQuery(trailItems ?? [], search),
    [trailItems, search],
  );

  useEffect(() => {
    if (!trailItems?.length) {
      return;
    }
    prefetchTrailImages(trailItems.map((item) => item.mapImageUrl));
  }, [trailItems]);

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

  const isGrid = viewMode === 'grid';
  const hasSearch = search.trim().length > 0;

  return (
    <Screen withStackHeader>
      {!trails.isError ? (
        <View style={[styles.stickyBar, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
          <TrailsToolbar
            filters={filters}
            onChangeFilters={setFilters}
            onClearFilters={onClearFilters}
            query={search}
            onChangeQuery={setSearch}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </View>
      ) : null}

      {trails.isError ? (
        <ErrorState
          title={t('trailsLoadError')}
          actionLabel={t('trailsRetry')}
          onAction={() => void trails.refetch()}
        />
      ) : (
        <FlatList
          key={viewMode}
          style={styles.fill}
          data={trails.isLoading ? [] : visibleTrails}
          keyExtractor={(item) => String(item.id)}
          numColumns={isGrid ? 2 : 1}
          columnWrapperStyle={isGrid ? styles.gridRow : undefined}
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
            ) : hasSearch && (trailItems?.length ?? 0) > 0 ? (
              <EmptyState
                icon={Footprints}
                title={t('trailsNoResultsTitle')}
                description={t('trailsNoResultsMessage')}
                actionLabel={t('trailsClearSearch')}
                onAction={() => setSearch('')}
              />
            ) : (
              <EmptyState icon={Footprints} title={t('trailsEmpty')} />
            )
          }
          ListFooterComponent={
            trails.data?.attribution ? (
              <Text style={[styles.attribution, { color: theme.muted }]}>
                {t(
                  trails.data.attribution.toLowerCase().includes('visitazores')
                    ? 'trailsAttribution'
                    : 'trailsAttributionOpenData',
                )}
              </Text>
            ) : null
          }
          renderItem={({ item }) => {
            const card = (
              <TrailCard
                trail={item}
                variant={viewMode}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/trails/[id]',
                    params: { id: String(item.id) },
                  })
                }
              />
            );
            return isGrid ? <View style={styles.gridItem}>{card}</View> : card;
          }}
          contentContainerStyle={styles.list}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  stickyBar: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  list: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space['2xl'] },
  gridRow: { justifyContent: 'space-between', alignItems: 'stretch' },
  gridItem: { width: '48%', marginBottom: space.md, alignSelf: 'stretch' },
  skeletons: { gap: space.md, paddingTop: space.sm },
  attribution: { fontSize: 11, lineHeight: 16, marginTop: space.sm },
});
