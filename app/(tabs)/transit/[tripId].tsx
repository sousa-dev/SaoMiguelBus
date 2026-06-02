import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';

import { TripDetail } from '@/features/transit/components/TripDetail';
import { useBootstrap, useTripDetail } from '@/features/transit/hooks/useTransitQueries';
import { useAppTheme } from '@/lib/theme';
import type { TransitSearchResult } from '@/lib/types';

export default function TripDetailScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const id = Number(tripId);
  const tripQuery = useTripDetail(id, Number.isFinite(id));
  const bootstrap = useBootstrap();

  if (tripQuery.isLoading) {
    return (
      <Screen withStackHeader style={styles.center}>
        <ActivityIndicator color={theme.primary} />
      </Screen>
    );
  }

  if (tripQuery.isError || !tripQuery.data) {
    return (
      <Screen withStackHeader style={styles.center}>
        <Text style={{ color: theme.muted }}>{t('noRoutesSubtitle')}</Text>
      </Screen>
    );
  }

  const detail = tripQuery.data;
  const trip: TransitSearchResult = {
    id: detail.id,
    route: detail.route,
    origin: detail.stops[0]?.name ?? '',
    destination: detail.stops[detail.stops.length - 1]?.name ?? '',
    start: detail.stops[0]?.time ?? '',
    end: detail.stops[detail.stops.length - 1]?.time ?? '',
    typeOfDay: detail.typeOfDay,
    likesPercent: detail.likesPercent ?? 0,
    dislikesPercent: detail.dislikesPercent ?? 0,
    information: detail.information,
    stops: detail.stops,
  };

  const infoNotice =
    bootstrap.data?.infos?.find((info) => {
      const route = typeof info.route === 'string' ? info.route : '';
      return route === detail.route;
    }) ?? null;

  return (
    <Screen withStackHeader>
      <ScrollView contentContainerStyle={styles.content}>
        {infoNotice && typeof infoNotice.text === 'object' ? (
          <View style={[styles.notice, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={{ color: theme.text }}>
              {String((infoNotice.text as Record<string, string>).pt ?? '')}
            </Text>
          </View>
        ) : null}
        <TripDetail trip={trip} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notice: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
});
