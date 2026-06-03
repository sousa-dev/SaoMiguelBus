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
import {
  trackTrailFilter,
  useTrails,
  type TrailListFilters,
} from '@/features/trails/hooks/useTrailQueries';
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
  const [draftFilters, setDraftFilters] = useState<TrailListFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<TrailListFilters>(EMPTY_FILTERS);
  const trails = useTrails(appliedFilters, showTrails);

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

  const onApplyFilters = useCallback(() => {
    setAppliedFilters(draftFilters);
    trackTrailFilter(draftFilters);
  }, [draftFilters]);

  const onResetFilters = useCallback(() => {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  }, []);

  if (!showTrails) {
    return null;
  }

  return (
    <Screen withStackHeader>
      <TrailFilters
        draft={draftFilters}
        applied={appliedFilters}
        onDraftChange={setDraftFilters}
        onApply={onApplyFilters}
        onReset={onResetFilters}
      />

      {trails.isLoading ? (
        <View style={{ padding: space.lg }}>
          <CardSkeleton />
          <CardSkeleton />
        </View>
      ) : null}
      {trails.isError ? (
        <ErrorState title={t('trailsLoadError')} actionLabel={t('searchButton')} onAction={() => void trails.refetch()} />
      ) : null}

      <FlatList
        data={trails.data?.trails ?? []}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl
            refreshing={trails.isRefetching}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          !trails.isLoading ? (
            <EmptyState icon={Footprints} title={t('trailsEmpty')} />
          ) : null
        }
        ListFooterComponent={
          trails.data?.attribution ? (
            <Text style={{ color: theme.muted, fontSize: 11, lineHeight: 16, marginTop: 8 }}>
              {trails.data.attribution}
            </Text>
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
  list: { padding: 12, paddingBottom: 24 },
});
