import { Ticket } from 'lucide-react-native';
import { useCallback } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { Button } from '@/components/ui/Button';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateView';
import { TourCard } from '@/features/events/components/TourCard';
import { useTours } from '@/features/events/hooks/useTourQueries';
import { VIATOR_FALLBACK_URL, openViatorExternal } from '@/features/events/viator';
import { track } from '@/lib/analytics';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

export default function ToursScreen() {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const tours = useTours();

  useFocusEffect(
    useCallback(() => {
      void tours.refetch();
      track('tours', 'view', { screen: 'list', locale: i18n.language });
    }, [tours.refetch, i18n.language]),
  );

  const onRefresh = useCallback(() => {
    void tours.refetch();
  }, [tours.refetch]);

  const fromPriceLabel = (price: number, currency: string) =>
    t('tourFromPrice', { price: price.toFixed(0), currency });

  const reviewsLabel = (count: number) => t('tourReviews', { count });

  return (
    <Screen withStackHeader>
      <Text style={[typography.body, styles.subtitle, { color: theme.muted }]}>{t('toursSubtitle')}</Text>

      {tours.isLoading ? (
        <View style={styles.list}>
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

      <FlatList
        data={tours.isLoading ? [] : (tours.data ?? [])}
        keyExtractor={(item) => item.code}
        refreshControl={
          <RefreshControl
            refreshing={tours.isRefetching}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          !tours.isLoading && !tours.isError ? (
            <EmptyState
              icon={Ticket}
              title={t('toursEmpty')}
              actionLabel={t('toursFallbackLinkLabel')}
              onAction={() => openViatorExternal(VIATOR_FALLBACK_URL)}
            />
          ) : null
        }
        ListFooterComponent={
          (tours.data?.length ?? 0) > 0 ? (
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { textAlign: 'center', paddingHorizontal: space.lg, paddingBottom: space.sm },
  list: { padding: space.lg, paddingBottom: space['2xl'] },
  footerBtn: { marginTop: space.md },
});
