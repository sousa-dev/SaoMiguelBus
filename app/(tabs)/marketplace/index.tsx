import { Plus, Share2, Store } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import type { Href } from 'expo-router';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { Banner } from '@/components/ui/Banner';
import { useFabActions } from '@/lib/fab-store';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateView';
import { space } from '@/lib/tokens';
import { MarketplaceRegisterCta } from '@/features/marketplace/components/MarketplaceRegisterCta';
import { MarketplaceToolbar } from '@/features/marketplace/components/MarketplaceToolbar';
import { ProviderCard } from '@/features/marketplace/components/ProviderCard';
import {
  buildMarketplaceListItems,
  DEFAULT_MARKETPLACE_FILTERS,
  type MarketplaceListFilters,
  type MarketplaceListItem,
} from '@/features/marketplace/filterHelpers';
import {
  useMarketplaceCategories,
  useProviders,
} from '@/features/marketplace/hooks/useMarketplaceQueries';
import {
  MARKETPLACE_REGISTER_URL,
  shareMarketplaceListingInvite,
} from '@/features/marketplace/share-listing-invite';
import { useNearbyLocation } from '@/features/traffic/hooks/useNearbyLocation';
import { track } from '@/lib/analytics';
import { useAppTheme } from '@/lib/theme';

export default function MarketplaceScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<MarketplaceListFilters>(DEFAULT_MARKETPLACE_FILTERS);

  const location = useNearbyLocation(filters.nearMe);
  const nearMeCoords = filters.nearMe && location.permission === 'granted' ? location.coords : null;

  useFabActions(
    useMemo(
      () => [
        {
          key: 'add-listing',
          labelKey: 'marketplaceAddListing',
          icon: Plus,
          href: '/(tabs)/marketplace/new' as Href,
        },
        {
          key: 'share-listing-invite',
          labelKey: 'fabShareMarketplaceInvite',
          icon: Share2,
          onPress: () =>
            void shareMarketplaceListingInvite(
              t('fabShareMarketplaceInviteMessage', { url: MARKETPLACE_REGISTER_URL }),
              { title: t('fabShareMarketplaceInvite'), alertTitle: t('fabShareMarketplaceInvite') },
            ),
        },
      ],
      [t],
    ),
  );

  const categories = useMarketplaceCategories();
  const providers = useProviders({
    ...filters,
    q: query.trim() || undefined,
    lat: nearMeCoords?.lat,
    lng: nearMeCoords?.lng,
  });

  const listItems = useMemo(
    () => buildMarketplaceListItems(providers.data ?? []),
    [providers.data],
  );

  useFocusEffect(
    useCallback(() => {
      void providers.refetch();
      track('marketplace', 'view', { screen: 'list' });
    }, [providers.refetch]),
  );

  const clearFilters = () => {
    setFilters(DEFAULT_MARKETPLACE_FILTERS);
  };

  const renderItem = ({ item }: { item: MarketplaceListItem }) => {
    if (item.type === 'cta') {
      return <MarketplaceRegisterCta variant="compact" />;
    }
    return (
      <ProviderCard
        provider={item.provider}
        viewerCoords={nearMeCoords}
        onPress={() =>
          router.push({ pathname: '/(tabs)/marketplace/[id]', params: { id: String(item.provider.id) } })
        }
      />
    );
  };

  return (
    <Screen withStackHeader>
      <MarketplaceToolbar
        categories={categories.data ?? []}
        filters={filters}
        onChangeFilters={setFilters}
        onClearFilters={clearFilters}
        query={query}
        onChangeQuery={setQuery}
        nearMeAvailable={Boolean(nearMeCoords)}
      />

      {filters.nearMe && location.permission === 'denied' ? (
        <View style={styles.bannerWrap}>
          <Banner message={t('marketplaceNearMeDenied')} variant="warning" />
        </View>
      ) : null}

      {providers.isLoading ? (
        <View style={{ padding: space.lg }}>
          <CardSkeleton />
        </View>
      ) : null}
      {providers.isError ? (
        <ErrorState
          title={t('marketplaceLoadError')}
          actionLabel={t('searchButton')}
          onAction={() => void providers.refetch()}
        />
      ) : null}

      <FlatList
        data={listItems}
        keyExtractor={(item) => (item.type === 'cta' ? item.id : String(item.provider.id))}
        refreshControl={
          <RefreshControl
            refreshing={providers.isRefetching}
            onRefresh={() => void providers.refetch()}
            tintColor={theme.primary}
          />
        }
        ListHeaderComponent={
          !providers.isLoading && !providers.isError ? (
            <MarketplaceRegisterCta variant="compact" />
          ) : null
        }
        ListEmptyComponent={
          !providers.isLoading ? (
            <EmptyState
              icon={Store}
              title={t('marketplaceEmpty')}
              actionLabel={t('marketplaceAddListing')}
              onAction={() => router.push('/(tabs)/marketplace/new' as Href)}
            />
          ) : null
        }
        ListFooterComponent={
          !providers.isLoading && !providers.isError && listItems.length > 0 ? (
            <MarketplaceRegisterCta />
          ) : null
        }
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: space.md, paddingBottom: space['4xl'] },
  bannerWrap: { paddingHorizontal: space.md, paddingBottom: space.sm },
});
