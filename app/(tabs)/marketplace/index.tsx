import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
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
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const categories = useMarketplaceCategories();
  const providers = useProviders({
    q: query.trim() || undefined,
    category: category ?? undefined,
    lat: coords?.lat,
    lng: coords?.lng,
  });

  useFocusEffect(
    useCallback(() => {
      void providers.refetch();
      track('marketplace', 'view', { screen: 'list' });
    }, [providers.refetch]),
  );

  const toggleNearMe = useCallback(() => {
    if (coords) {
      setCoords(null);
      return;
    }
    const geo = (typeof navigator !== 'undefined' ? (navigator as any).geolocation : undefined);
    if (!geo?.getCurrentPosition) {
      return; // native without expo-location: degrade to default ordering
    }
    geo.getCurrentPosition(
      (pos: { coords: { latitude: number; longitude: number } }) =>
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setCoords(null),
    );
  }, [coords]);

  return (
    <Screen withStackHeader>
      <MarketplaceFilters
        theme={theme}
        categories={categories.data ?? []}
        activeCategory={category}
        query={query}
        nearMe={coords !== null}
        onChangeQuery={setQuery}
        onSelectCategory={setCategory}
        onToggleNearMe={toggleNearMe}
      />

      {providers.isLoading ? <ActivityIndicator color={theme.primary} /> : null}
      {providers.isError ? <Text style={{ color: theme.muted }}>{t('marketplaceLoadError')}</Text> : null}

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
            <Text style={{ color: theme.muted, textAlign: 'center', marginTop: 24 }}>
              {t('marketplaceEmpty')}
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <ProviderCard
            provider={item}
            theme={theme}
            onPress={() =>
              router.push({ pathname: '/(tabs)/marketplace/[id]', params: { id: String(item.id) } })
            }
          />
        )}
        contentContainerStyle={styles.list}
      />

      <Pressable
        onPress={() => router.push('/(tabs)/marketplace/new')}
        style={[styles.fab, { backgroundColor: theme.primary }]}
      >
        <Text style={styles.fabText}>+ {t('marketplaceAddListing')}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 12, paddingBottom: 90 },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 20,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    elevation: 3,
  },
  fabText: { color: '#fff', fontWeight: '700' },
});
