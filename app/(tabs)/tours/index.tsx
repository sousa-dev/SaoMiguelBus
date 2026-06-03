import { Ticket } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { Button } from '@/components/ui/Button';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateView';
import { TourCard } from '@/features/events/components/TourCard';
import { EMPTY_TOUR_FILTERS, ToursToolbar } from '@/features/events/components/ToursToolbar';
import { filterAndSortTours, hasActiveTourFilters } from '@/features/events/filterHelpers';
import { trackTourFilter, useTours } from '@/features/events/hooks/useTourQueries';
import { VIATOR_FALLBACK_URL, openViatorExternal } from '@/features/events/viator';
import { track } from '@/lib/analytics';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

export default function ToursScreen() {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const tours = useTours();
  const [filters, setFilters] = useState(EMPTY_TOUR_FILTERS);

  const allTours = tours.data ?? [];
  const visibleTours = useMemo(
    () => filterAndSortTours(allTours, filters),
    [allTours, filters],
  );

  useFocusEffect(
    useCallback(() => {
      void tours.refetch();
      track('tours', 'view', { screen: 'list', locale: i18n.language });
    }, [tours.refetch, i18n.language]),
  );

  const onRefresh = useCallback(() => {
    void tours.refetch();
  }, [tours.refetch]);

  const onClearFilters = useCallback(() => {
    setFilters(EMPTY_TOUR_FILTERS);
    trackTourFilter(EMPTY_TOUR_FILTERS);
  }, []);

  const fromPriceLabel = (price: number, currency: string) =>
    t('tourFromPrice', { price: price.toFixed(0), currency });

  const reviewsLabel = (count: number) => t('tourReviews', { count });

  const subtitle = (
    <Text style={[typography.body, styles.subtitle, { color: theme.muted }]}>{t('toursSubtitle')}</Text>
  );

  const showToolbar = !tours.isLoading && !tours.isError && allTours.length > 0;

  const emptyComponent = useMemo(() => {
    if (tours.isLoading || tours.isError) {
      return null;
    }
    if (allTours.length === 0) {
      return (
        <EmptyState
          icon={Ticket}
          title={t('toursEmpty')}
          actionLabel={t('toursFallbackLinkLabel')}
          onAction={() => openViatorExternal(VIATOR_FALLBACK_URL)}
        />
      );
    }
    if (hasActiveTourFilters(filters)) {
      return (
        <EmptyState
          icon={Ticket}
          title={t('toursNoResultsTitle')}
          description={t('toursNoResultsMessage')}
          actionLabel={t('toursFilterClear')}
          onAction={onClearFilters}
        />
      );
    }
    return null;
  }, [tours.isLoading, tours.isError, allTours.length, filters, t, onClearFilters]);

  return (
    <Screen withStackHeader>
      {showToolbar ? (
        <View style={[styles.stickyBar, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
          <ToursToolbar filters={filters} onChange={setFilters} onClear={onClearFilters} />
        </View>
      ) : null}

      {tours.isLoading ? (
        <View style={styles.list}>
          {subtitle}
          <CardSkeleton imageHeight={160} />
          <CardSkeleton imageHeight={160} />
        </View>
      ) : null}

      {tours.isError ? (
        <ErrorState
          title={t('toursLoadError')}
          actionLabel={t('toursBrowseAll')}
          onAction={() => openViatorExternal(VIATOR_FALLBACK_URL)}
        />
      ) : null}

      {!tours.isLoading && !tours.isError ? (
        <FlatList
          style={styles.fill}
          data={visibleTours}
          keyExtractor={(item) => item.code}
          ListHeaderComponent={subtitle}
          refreshControl={
            <RefreshControl
              refreshing={tours.isRefetching}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          }
          ListEmptyComponent={emptyComponent}
          ListFooterComponent={
            visibleTours.length > 0 ? (
              <Button
                label={`${t('toursBrowseAll')} ↗`}
                variant="outline"
                onPress={() => openViatorExternal(VIATOR_FALLBACK_URL)}
                fullWidth
                style={styles.footerBtn}
              />
            ) : null
          }
          renderItem={({ item }) => (
            <TourCard
              tour={item}
              fromPriceLabel={fromPriceLabel}
              reviewsLabel={reviewsLabel}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/tours/[tourId]',
                  params: { tourId: item.code },
                })
              }
            />
          )}
          contentContainerStyle={styles.list}
        />
      ) : null}
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
  subtitle: { textAlign: 'center', paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm },
  list: { padding: space.lg, paddingBottom: space['2xl'] },
  footerBtn: { marginTop: space.md },
});
