import { useCallback } from 'react';
import { BackHandler, ScrollView, StyleSheet, Text } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { Banner } from '@/components/ui/Banner';
import { Card } from '@/components/ui/Card';
import { ErrorState, LoadingState } from '@/components/ui/StateView';
import { TripDetail } from '@/features/transit/components/TripDetail';
import { useBootstrap, useTripDetail } from '@/features/transit/hooks/useTransitQueries';
import { useNetworkStatus } from '@/lib/network-status';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { TransitSearchResult } from '@/lib/types';

export default function TripDetailScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const { isOnline } = useNetworkStatus();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const id = Number(tripId);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (navigation.canGoBack()) {
          return false;
        }
        router.replace('/(tabs)/transit');
        return true;
      });
      return () => sub.remove();
    }, [navigation, router]),
  );

  const tripQuery = useTripDetail(id, Number.isFinite(id));
  const bootstrap = useBootstrap();

  if (tripQuery.isLoading) {
    return (
      <Screen withStackHeader>
        <LoadingState />
      </Screen>
    );
  }

  if (tripQuery.isError || !tripQuery.data) {
    return (
      <Screen withStackHeader>
        <ErrorState
          title={t('noRoutesSubtitle')}
          actionLabel={t('settingsBack')}
          onAction={() => router.back()}
        />
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
        {!isOnline ? <Banner variant="offline" message={t('offlineSearchDisabled')} /> : null}

        {infoNotice && typeof infoNotice.text === 'object' ? (
          <Card style={{ marginBottom: space.md }}>
            <Text style={[typography.body, { color: theme.text }]}>
              {String((infoNotice.text as Record<string, string>).pt ?? '')}
            </Text>
          </Card>
        ) : null}

        <TripDetail trip={trip} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space['4xl'] },
});
