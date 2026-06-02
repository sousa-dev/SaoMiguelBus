import { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { TourCard } from '@/features/events/components/TourCard';
import { useTours } from '@/features/events/hooks/useTourQueries';
import { VIATOR_FALLBACK_URL, openViatorExternal } from '@/features/events/viator';
import { track } from '@/lib/analytics';
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
      <View style={styles.header}>
        <Text style={[styles.subtitle, { color: theme.muted }]}>{t('toursSubtitle')}</Text>
      </View>

      {tours.isLoading ? <ActivityIndicator color={theme.primary} style={styles.loader} /> : null}
      {tours.isError ? (
        <Text style={[styles.message, { color: theme.muted }]}>{t('toursLoadError')}</Text>
      ) : null}

      <FlatList
        data={tours.data ?? []}
        keyExtractor={(item) => item.code}
        refreshControl={
          <RefreshControl
            refreshing={tours.isRefetching}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          !tours.isLoading ? (
            <View style={styles.empty}>
              <Text style={{ color: theme.muted, textAlign: 'center' }}>{t('toursEmpty')}</Text>
              <Pressable
                onPress={() => openViatorExternal(VIATOR_FALLBACK_URL)}
                style={styles.fallbackLink}
              >
                <Text style={{ color: theme.primary, fontWeight: '600' }}>
                  {t('toursFallbackLinkLabel')}
                </Text>
              </Pressable>
            </View>
          ) : null
        }
        ListFooterComponent={
          (tours.data?.length ?? 0) > 0 ? (
            <View style={styles.footer}>
              <Pressable onPress={() => openViatorExternal(VIATOR_FALLBACK_URL)}>
                <Text style={{ color: theme.primary, textAlign: 'center', fontWeight: '600' }}>
                  {t('toursBrowseAll')}
                </Text>
              </Pressable>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TourCard
            tour={item}
            theme={theme}
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  loader: {
    marginVertical: 12,
  },
  message: {
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  empty: {
    marginTop: 24,
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  fallbackLink: {
    marginTop: 8,
  },
  footer: {
    marginTop: 8,
    paddingVertical: 12,
  },
});
