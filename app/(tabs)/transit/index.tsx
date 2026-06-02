import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!isOnline ? <OfflineBanner /> : null}

        <Text style={[styles.title, { color: theme.primary }]}>
          {staticIslandConfig.islandName} · {t('bannerTitle')}
        </Text>
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
                <Pressable
                  key={d}
                  onPress={() => setDay(d)}
                  style={[
                    styles.dayChip,
                    {
                      backgroundColor: day === d ? theme.primary : theme.card,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text style={{ color: day === d ? '#fff' : theme.text, fontSize: 12 }}>
                    {t(d)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { color: theme.text }]}>{t('timeLabel')}</Text>
            <TextInput
              style={[
                styles.input,
                { borderColor: theme.border, color: theme.text, backgroundColor: theme.card },
              ]}
              value={time}
              onChangeText={setTime}
              placeholder="08:00"
              placeholderTextColor={theme.muted}
            />

            <Pressable
              onPress={runSearch}
              style={[
                styles.searchBtn,
                { backgroundColor: isOnline ? theme.primary : theme.muted },
              ]}
              disabled={!isOnline}
            >
              <Text style={styles.searchBtnText}>{t('searchButton')}</Text>
            </Pressable>

            <Pressable
              onPress={openDirections}
              style={[
                styles.directionsBtn,
                {
                  backgroundColor: isOnline ? theme.secondary : theme.muted,
                  opacity: isOnline ? 1 : 0.7,
                },
              ]}
              disabled={!isOnline || !origin || !destination}
            >
              <Text style={styles.searchBtnText}>{t('directionsButton')}</Text>
            </Pressable>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  label: { fontWeight: '600', marginBottom: 6, marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  dayChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  searchBtn: { marginTop: 8, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  directionsBtn: { marginTop: 8, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
