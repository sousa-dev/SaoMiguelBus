import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { space, typography } from '@/lib/tokens';

import { FavoriteToggle } from '@/features/transit/components/FavoriteToggle';
import { FavoritesPanel } from '@/features/transit/components/FavoritesPanel';
import { OfflineBanner } from '@/features/transit/components/OfflineBanner';
import { RouteResults } from '@/features/transit/components/RouteResults';
import { StopPicker } from '@/features/transit/components/StopPicker';
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
    if (!origin || !destination) {
      return;
    }
    if (!isOnline) {
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

  const offlineSearchMessage = useMemo(() => {
    if (isOnline || !searchEnabled) {
      return null;
    }
    return t('offlineSearchDisabled');
  }, [isOnline, searchEnabled, t]);

  return (
    <Screen withStackHeader>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!isOnline ? <OfflineBanner /> : null}

        <Text style={[styles.title, { color: theme.primary }]}>{islandName}</Text>
        <Text style={{ color: theme.muted, marginBottom: 16 }}>{t('bannerSubtitle')}</Text>

        <FavoritesPanel onSelect={applyFavorite} />

        {stopsLoading && isOnline ? (
          <ActivityIndicator color={theme.primary} />
        ) : (
          <>
            <StopPicker
              label={t('originLabel')}
              placeholder={t('originPlaceholder')}
              value={origin}
              stops={stops}
              onSelect={setOrigin}
            />
            <StopPicker
              label={t('destinationLabel')}
              placeholder={t('destinationPlaceholder')}
              value={destination}
              stops={stops}
              onSelect={setDestination}
            />

            <FavoriteToggle origin={origin} destination={destination} />

            <Text style={[styles.label, { color: theme.text }]}>{t('dayLabel')}</Text>
            <View style={styles.dayRow}>
              {(['weekday', 'saturday', 'sunday'] as DayType[]).map((d) => (
                <Chip key={d} label={t(d)} selected={day === d} onPress={() => setDay(d)} />
              ))}
            </View>

            <Field label={t('timeLabel')} value={time} onChangeText={setTime} placeholder="08:00" />

            <Button label={t('searchButton')} onPress={runSearch} disabled={!isOnline} fullWidth />
            <Button
              label={t('directionsButton')}
              variant="secondary"
              onPress={openDirections}
              disabled={!isOnline || !origin || !destination}
              fullWidth
              style={{ marginTop: space.sm }}
            />
          </>
        )}

        {offlineSearchMessage ? (
          <Text style={{ color: theme.muted, marginTop: 12 }}>{offlineSearchMessage}</Text>
        ) : null}

        {search.isFetching ? <ActivityIndicator color={theme.primary} style={{ marginTop: 16 }} /> : null}
        {search.data ? (
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
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  label: { fontWeight: '600', marginBottom: 6, marginTop: 4 },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: space.md },
});
