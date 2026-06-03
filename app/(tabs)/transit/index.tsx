import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/ui/StateView';
import { space } from '@/lib/tokens';
import { Bus } from 'lucide-react-native';

import { ActiveTrackingSection } from '@/features/transit/components/ActiveTrackingSection';
import { OfflineBanner } from '@/features/transit/components/OfflineBanner';
import { PinnedRoutesSection } from '@/features/transit/components/PinnedRoutesSection';
import { RouteResults } from '@/features/transit/components/RouteResults';
import { TransitInstructionCard } from '@/features/transit/components/TransitInstructionCard';
import { TransitPlannerCard } from '@/features/transit/components/TransitPlannerCard';
import { TransitWebShell } from '@/features/transit/components/TransitWebShell';
import {
  useOfflineBundleSync,
  useCanSearchOffline,
  useTransitSearchWithOffline,
} from '@/features/transit/hooks/useOfflineSearch';
import { useBootstrap, useStops } from '@/features/transit/hooks/useTransitQueries';
import { useNetworkStatus } from '@/lib/network-status';
import { migrateLegacyFavorites, useProfileStore } from '@/lib/profile-store';
import { useAppTheme } from '@/lib/theme';
import { resolveDayType } from '@/lib/transit-format';

function currentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function searchParam(value: string | string[] | undefined): string {
  if (value == null) {
    return '';
  }
  return typeof value === 'string' ? value : (value[0] ?? '');
}

export default function TransitScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ origin?: string; destination?: string }>();
  const { isOnline } = useNetworkStatus();
  const canSearchOffline = useCanSearchOffline();
  const bootstrap = useBootstrap();
  const { data: stops = [], isLoading: stopsLoading } = useStops();
  const addRecentSearch = useProfileStore((s) => s.addRecentSearch);

  const [origin, setOrigin] = useState(() => searchParam(params.origin));
  const [destination, setDestination] = useState(() => searchParam(params.destination));
  const [date, setDate] = useState(() => new Date());
  const [time, setTime] = useState(currentTime);
  const [searchEnabled, setSearchEnabled] = useState(false);

  useEffect(() => {
    const nextOrigin = searchParam(params.origin);
    const nextDestination = searchParam(params.destination);
    if (nextOrigin) {
      setOrigin(nextOrigin);
    }
    if (nextDestination) {
      setDestination(nextDestination);
    }
  }, [params.origin, params.destination]);

  const day = useMemo(
    () => resolveDayType(date, bootstrap.data?.holidays),
    [date, bootstrap.data?.holidays],
  );

  useEffect(() => {
    void migrateLegacyFavorites();
  }, []);

  useOfflineBundleSync(true);

  const searchParams = useMemo(
    () => ({
      origin,
      destination,
      day,
      start: time.replace(':', 'h'),
      enabled: searchEnabled && Boolean(origin && destination),
    }),
    [origin, destination, day, time, searchEnabled],
  );

  const search = useTransitSearchWithOffline(searchParams);

  useEffect(() => {
    if (search.data && search.data.length > 0 && searchEnabled) {
      addRecentSearch({ origin, destination, day, time });
    }
  }, [search.data, searchEnabled, origin, destination, day, time, addRecentSearch]);

  const runSearch = () => {
    if (!origin || !destination || !canSearchOffline) {
      return;
    }
    setSearchEnabled(true);
    search.refetch();
  };

  const openDirections = () => {
    if (!isOnline) {
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

  const applySearch = (nextOrigin: string, nextDestination: string) => {
    setOrigin(nextOrigin);
    setDestination(nextDestination);
    setSearchEnabled(true);
  };

  const showEmptyResults =
    searchEnabled && !search.isFetching && search.data && search.data.length === 0;
  const hasResults = Boolean(search.data && search.data.length > 0);
  const showInstructions = !searchEnabled && !hasResults;

  return (
    <Screen withStackHeader>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TransitWebShell>
          {!isOnline ? <OfflineBanner /> : null}

          <ActiveTrackingSection />
          <PinnedRoutesSection onSelect={(o, d) => applySearch(o, d)} />

          {!stopsLoading || !isOnline ? (
            <TransitPlannerCard
              origin={origin}
              destination={destination}
              date={date}
              time={time}
              stops={stops}
              isOnline={canSearchOffline}
              directionsOnline={isOnline}
              searching={search.isFetching}
              onOriginChange={setOrigin}
              onDestinationChange={setDestination}
              onDateChange={setDate}
              onTimeChange={setTime}
              onSearch={runSearch}
              onDirections={openDirections}
            />
          ) : (
            <ActivityIndicator color={theme.primary} style={{ marginVertical: space.xl }} />
          )}

          {search.isFetching && !hasResults ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: space.lg }} />
          ) : null}

          {showEmptyResults ? (
            <EmptyState
              icon={Bus}
              title={t('noRoutesMessage', { origin, destination })}
              description={t('noRoutesSubtitle')}
              actionLabel={isOnline ? t('tryDirectionsButton') : undefined}
              onAction={isOnline ? openDirections : undefined}
            />
          ) : null}

          {hasResults && search.data ? (
            <RouteResults
              results={search.data}
              searchDay={day}
              origin={origin}
              destination={destination}
              onFavoriteSelect={(o, d) => applySearch(o, d)}
            />
          ) : null}

          {showInstructions ? <TransitInstructionCard /> : null}
        </TransitWebShell>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: space.md,
    paddingBottom: space['4xl'],
    alignItems: 'center',
  },
});
