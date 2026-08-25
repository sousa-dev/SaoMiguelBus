import { ArrowRight, Bus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateView';
import { DirectionsPlannerForm } from '@/features/transit/components/DirectionsPlannerForm';
import { DirectionsResults } from '@/features/transit/components/DirectionsResults';
import { TransitWebShell } from '@/features/transit/components/TransitWebShell';
import { ScreenTopAdBanner } from '@/features/ads/components/ScreenTopAdBanner';
import { useBootstrap, useDirections, useStops } from '@/features/transit/hooks/useTransitQueries';
import { useNetworkStatus } from '@/lib/network-status';
import { elevation, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import { resolveDayType } from '@/lib/transit-format';

function startFromParam(start: string): string {
  return start.replace('h', ':');
}

export default function DirectionsScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { isOnline } = useNetworkStatus();
  const { data: stops = [] } = useStops();
  const bootstrap = useBootstrap();
  const params = useLocalSearchParams<{
    origin?: string;
    destination?: string;
    day?: string;
    start?: string;
  }>();

  const [origin, setOrigin] = useState(params.origin ?? '');
  const [destination, setDestination] = useState(params.destination ?? '');
  const [date, setDate] = useState(() => new Date());
  const [time, setTime] = useState(() => startFromParam(params.start ?? '08h00'));
  const [submitted, setSubmitted] = useState(() => Boolean(params.origin && params.destination));

  const day = useMemo(
    () => resolveDayType(date, bootstrap.data?.holidays),
    [date, bootstrap.data?.holidays],
  );

  const directions = useDirections({
    origin,
    destination,
    day,
    start: time.replace(':', 'h'),
    enabled: submitted && isOnline && Boolean(origin && destination),
  });

  const onSubmit = () => {
    if (!origin || !destination || !isOnline) {
      return;
    }
    setSubmitted(true);
    void directions.refetch();
  };

  const empty =
    submitted &&
    !directions.isLoading &&
    !directions.isError &&
    directions.data &&
    (!directions.data.routes?.length || directions.data.routes.length === 0);

  return (
    <Screen withStackHeader>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TransitWebShell>
          <ScreenTopAdBanner embedded />
          {!isOnline ? <Banner variant="offline" message={t('offlineSearchDisabled')} /> : null}

          <DirectionsPlannerForm
            origin={origin}
            destination={destination}
            date={date}
            time={time}
            stops={stops}
            submitting={directions.isFetching}
            disabled={!isOnline}
            onOriginChange={setOrigin}
            onDestinationChange={setDestination}
            onDateChange={setDate}
            onTimeChange={setTime}
            onSubmit={onSubmit}
          />

          {submitted && origin && destination ? (
            <View
              style={[
                styles.headerCard,
                { backgroundColor: theme.card, borderColor: theme.border },
                elevation(1, theme.text),
              ]}
            >
              <View style={styles.endpoints}>
                <Text style={[typography.headline, { color: theme.text, flex: 1 }]} numberOfLines={2}>
                  {origin}
                </Text>
                <ArrowRight size={20} color={theme.muted} style={styles.arrow} />
                <Text style={[typography.headline, { color: theme.text, flex: 1 }]} numberOfLines={2}>
                  {destination}
                </Text>
              </View>
            </View>
          ) : null}

          {directions.isLoading && submitted ? <LoadingState title={t('searchButton')} /> : null}

          {directions.isError ? (
            <ErrorState
              icon={Bus}
              title={t('noRoutesMessage', { origin, destination })}
              description={t('noRoutesSubtitle')}
              actionLabel={t('settingsBack')}
              onAction={() => router.back()}
            />
          ) : null}

          {empty ? (
            <EmptyState
              icon={Bus}
              title={t('noRoutesMessage', { origin, destination })}
              description={t('noRoutesSubtitle')}
              actionLabel={t('settingsBack')}
              onAction={() => router.back()}
            />
          ) : null}

          {directions.data && !empty && submitted ? (
            <DirectionsResults data={directions.data} origin={origin} destination={destination} />
          ) : null}

          {!directions.isLoading && (directions.isError || empty) ? (
            <Button label={t('settingsBack')} variant="outline" onPress={() => router.back()} fullWidth />
          ) : null}
        </TransitWebShell>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.md, paddingBottom: space['4xl'], alignItems: 'center' },
  headerCard: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.lg,
    width: '100%',
    marginTop: space.md,
  },
  endpoints: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  arrow: { marginHorizontal: space.xs },
});
