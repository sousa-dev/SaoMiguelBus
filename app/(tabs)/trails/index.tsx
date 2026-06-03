import React, { useCallback, useEffect, useState } from 'react';
import { Footprints, LayoutGrid, List as ListIcon } from 'lucide-react-native';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateView';
import { iconSize, radius, space } from '@/lib/tokens';
import { TrailCard } from '@/features/trails/components/TrailCard';
import { TrailFilters } from '@/features/trails/components/TrailFilters';
import { trackTrailFilter, useTrails, type TrailListFilters } from '@/features/trails/hooks/useTrailQueries';
import { prefetchTrailImages } from '@/features/trails/trailImageCache';
import { staticIslandConfig } from '@/config/island';
import { useBootstrap } from '@/features/transit/hooks/useTransitQueries';
import { track } from '@/lib/analytics';
import { useAppTheme } from '@/lib/theme';

const EMPTY_FILTERS: TrailListFilters = {};
type ViewMode = 'list' | 'grid';

export default function TrailsScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { data: bootstrap } = useBootstrap();
  const modules = bootstrap?.island?.enabledModules ?? staticIslandConfig.enabledModules;
  const showTrails = modules.includes('trails');
  const [filters, setFilters] = useState<TrailListFilters>(EMPTY_FILTERS);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const trails = useTrails(filters, showTrails);
  const trailItems = trails.data?.trails;

  useEffect(() => {
    if (!trailItems?.length) {
      return;
    }
    prefetchTrailImages(trailItems.map((t) => t.mapImageUrl));
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

  const ViewToggle = (
    <View style={styles.toggleRow}>
      {(['list', 'grid'] as const).map((mode) => {
        const active = viewMode === mode;
        const Icon = mode === 'list' ? ListIcon : LayoutGrid;
        return (
          <Pressable
            key={mode}
            accessibilityRole="button"
            accessibilityLabel={t(mode === 'list' ? 'trailsViewList' : 'trailsViewGrid')}
            accessibilityState={{ selected: active }}
            onPress={() => setViewMode(mode)}
            style={[
              styles.toggleBtn,
              {
                backgroundColor: active ? theme.primary : theme.surfaceVariant,
                borderColor: active ? theme.primary : theme.border,
              },
            ]}
          >
            <Icon size={iconSize.sm} color={active ? theme.onPrimary : theme.muted} />
          </Pressable>
        );
      })}
    </View>
  );

  const listHeader = (
    <View>
      <TrailFilters filters={filters} onChange={setFilters} onClear={onClearFilters} />
      {ViewToggle}
    </View>
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
        key={viewMode}
        data={trails.isLoading ? [] : (trailItems ?? [])}
        keyExtractor={(item) => String(item.id)}
        numColumns={isGrid ? 2 : 1}
        columnWrapperStyle={isGrid ? styles.gridRow : undefined}
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: space.lg, paddingBottom: space['2xl'] },
  gridRow: { justifyContent: 'space-between' },
  gridItem: { width: '48%', marginBottom: space.md },
  toggleRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.xs, marginBottom: space.md },
  toggleBtn: {
    width: 40,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletons: { gap: space.md, paddingTop: space.sm },
  attribution: { fontSize: 11, lineHeight: 16, marginTop: space.sm },
});
