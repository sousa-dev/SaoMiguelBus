import { Plus, Store } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import type { Href } from 'expo-router';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { useFabActions } from '@/lib/fab-store';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateView';
import { space } from '@/lib/tokens';
import { MarketplaceFilters } from '@/features/marketplace/components/MarketplaceFilters';
import { ProviderCard } from '@/features/marketplace/components/ProviderCard';
import {
  useMarketplaceCategories,
  useProviders,
} from '@/features/marketplace/hooks/useMarketplaceQueries';
import { track } from '@/lib/analytics';
import { useAppTheme } from '@/lib/theme';

export default function MarketplaceScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  useFabActions(
    useMemo(
      () => [
        {
          key: 'add-listing',
          labelKey: 'marketplaceAddListing',
          icon: Plus,
          href: '/(tabs)/marketplace/new' as Href,
        },
      ],
      [],
    ),
  );

  const categories = useMarketplaceCategories();
  const providers = useProviders({
    q: query.trim() || undefined,
    category: category ?? undefined,
  });

  useFocusEffect(
    useCallback(() => {
      void providers.refetch();
      track('marketplace', 'view', { screen: 'list' });
    }, [providers.refetch]),
  );

  return (
    <Screen withStackHeader>
      <MarketplaceFilters
        categories={categories.data ?? []}
        activeCategory={category}
        query={query}
        onChangeQuery={setQuery}
        onSelectCategory={setCategory}
      />

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
        data={providers.data ?? []}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl
            refreshing={providers.isRefetching}
            onRefresh={() => void providers.refetch()}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          !providers.isLoading ? (
            <EmptyState icon={Store} title={t('marketplaceEmpty')} />
          ) : null
        }
        renderItem={({ item }) => (
          <ProviderCard
            provider={item}
            onPress={() =>
              router.push({ pathname: '/(tabs)/marketplace/[id]', params: { id: String(item.id) } })
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
