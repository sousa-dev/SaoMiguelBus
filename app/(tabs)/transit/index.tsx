import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { EmptyState, LoadingState } from '@/components/ui/StateView';
import { space, typography } from '@/lib/tokens';
import { Bus } from 'lucide-react-native';

import { FavoritesPanel } from '@/features/transit/components/FavoritesPanel';
import { OfflineBanner } from '@/features/transit/components/OfflineBanner';
import { RouteResults } from '@/features/transit/components/RouteResults';
import { TransitPlannerCard } from '@/features/transit/components/TransitPlannerCard';
import { TripDetail } from '@/features/transit/components/TripDetail';
import { useBootstrap, useStops, useTransitSearch } from '@/features/transit/hooks/useTransitQueries';
import { staticIslandConfig } from '@/config/island';
import { useNetworkStatus } from '@/lib/network-status';
import { useAppTheme } from '@/lib/theme';
import type { TransitSearchResult } from '@/lib/types';

type DayType = 'weekday' | 'saturday' | 'sunday';

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function resolveDayTypeFromBootstrap(
  holidays: { date: string }[] | undefined,
  fallback: DayType,
): DayType {
  const today = todayIsoDate();
  if (holidays?.some((holiday) => holiday.date === today)) {
    return 'sunday';
  }
  const weekday = new Date().getDay();
  if (weekday === 0) {
    return 'sunday';
  }
  if (weekday === 6) {
    return 'saturday';
  }
  return fallback;
}

export default function TransitScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { isOnline } = useNetworkStatus();
  const bootstrap = useBootstrap();
  const { data: stops = [], isLoading: stopsLoading } = useStops();
  const islandName = bootstrap.data?.island?.name ?? staticIslandConfig.islandName;

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [day, setDay] = useState<DayType>('weekday');
  const [time, setTime] = useState('08:00');
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [selected, setSelected] = useState<TransitSearchResult | null>(null);

  useEffect(() => {
    setDay(resolveDayTypeFromBootstrap(bootstrap.data?.holidays, 'weekday'));
  }, [bootstrap.data?.holidays]);

  const search = useTransitSearch({
    origin,
    destination,
    day,
    start: time.replace(':', 'h'),
    enabled: searchEnabled && Boolean(origin && destination) && isOnline,
  });

  const runSearch = () => {
    if (!origin || !destination || !isOnline) {
      return;
    }
    setSearchEnabled(true);
    setSelected(null);
    search.refetch();
  };

  const openDirections = () => {
    if (!origin || !destination || !isOnline) {
      return;
    }
    router.push({
      pathname: '/(tabs)/transit/directions',
      params: {
        origin,
        destination,
        day,
        start: time.replace(':', 'h'),
      },
    });
  };

  const applyFavorite = (nextOrigin: string, nextDestination: string) => {
    setOrigin(nextOrigin);
    setDestination(nextDestination);
    setSearchEnabled(true);
    setSelected(null);
  };

  const showEmptyResults =
    searchEnabled && !search.isFetching && search.data && search.data.length === 0;

  return (
    <Screen withStackHeader>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!isOnline ? <OfflineBanner /> : null}

        <Text style={[typography.title, { color: theme.primary }]}>{islandName}</Text>
        <Text style={[typography.body, { color: theme.muted, marginBottom: space.lg }]}>{t('bannerSubtitle')}</Text>

        <FavoritesPanel onSelect={applyFavorite} />

        {stopsLoading && isOnline ? (
          <LoadingState title={t('originPlaceholder')} />
        ) : (
          <TransitPlannerCard
            origin={origin}
            destination={destination}
            day={day}
            time={time}
            stops={stops}
            isOnline={isOnline}
            onOriginChange={setOrigin}
            onDestinationChange={setDestination}
            onDayChange={setDay}
            onTimeChange={setTime}
            onSearch={runSearch}
            onDirections={openDirections}
          />
        )}

        {search.isFetching ? <ActivityIndicator color={theme.primary} style={{ marginTop: space.lg }} /> : null}

        {showEmptyResults ? (
          <EmptyState
            icon={Bus}
            title={t('noRoutesMessage', { origin, destination })}
            description={t('noRoutesSubtitle')}
          />
        ) : null}

        {search.data && search.data.length > 0 ? (
          <>
            <RouteResults
              results={search.data}
              selectedId={selected?.id}
              onSelect={setSelected}
            />
            <TripDetail trip={selected} />
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space['4xl'] },
});
