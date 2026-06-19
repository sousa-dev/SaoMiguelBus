import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { CachedBadge } from '@/components/ui/CachedBadge';
import { EmptyState, LoadingState } from '@/components/ui/StateView';
import { AdBanner } from '@/features/ads/components/AdBanner';
import { InterstitialOrchestrator } from '@/features/ads/components/InterstitialOrchestrator';
import { MinibusJourneyResults } from '@/features/minibus/components/MinibusJourneyResults';
import { MinibusPlannerCard } from '@/features/minibus/components/MinibusPlannerCard';
import { setPendingDirections } from '@/features/minibus/directionsStore';
import { TransitWebShell } from '@/features/transit/components/TransitWebShell';
import { useMinibusOffline } from '@/features/minibus/hooks/useMinibusOffline';
import { useMinibusLines, useMinibusNetwork } from '@/features/minibus/hooks/useMinibusQueries';
import { useMinibusRouteSearch } from '@/features/minibus/hooks/useMinibusRouteSearch';
import { track } from '@/lib/analytics';
import { space } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

export default function MinibusSearchScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { snapshot } = useMinibusOffline();
  const linesQuery = useMinibusLines();
  const offlineNetwork = snapshot?.bundle?.network ?? null;
  const networkQuery = useMinibusNetwork(!offlineNetwork);
  const network = offlineNetwork ?? networkQuery.data ?? null;
  const lines = linesQuery.data?.lines ?? snapshot?.bundle?.lines ?? [];

  const linesByCode = useMemo(
    () => new Map(lines.map((line) => [line.code, line])),
    [lines],
  );

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [submitted, setSubmitted] = useState<{ origin: string; destination: string } | null>(null);
  const [interstitialTrigger, setInterstitialTrigger] = useState(0);

  const stops = useMemo(() => {
    if (!network) {
      return [];
    }
    const seen = new Set<string>();
    const names: string[] = [];
    for (const line of network.lines) {
      for (const stop of line.stops) {
        if (!seen.has(stop.name_pt)) {
          seen.add(stop.name_pt);
          names.push(stop.name_pt);
        }
      }
    }
    return names.sort((a, b) => a.localeCompare(b));
  }, [network]);

  const { result, isLoading, source } = useMinibusRouteSearch(
    network,
    submitted?.origin ?? '',
    submitted?.destination ?? '',
    Boolean(submitted),
  );

  useEffect(() => {
    if (!submitted || isLoading) {
      return;
    }
    setInterstitialTrigger((value) => value + 1);
  }, [submitted, isLoading]);

  const onSwap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const onSearch = () => {
    const trimmedOrigin = origin.trim();
    const trimmedDestination = destination.trim();
    if (!trimmedOrigin || !trimmedDestination) {
      return;
    }
    track('minibus', 'search', { offline: Boolean(offlineNetwork) });
    void queryClient.invalidateQueries({ queryKey: ['ad', 'home'] });
    setSubmitted({ origin: trimmedOrigin, destination: trimmedDestination });
  };

  const journeys = result?.journeys ?? [];
  const hasSearched = Boolean(submitted);
  const showEmpty = hasSearched && !isLoading && journeys.length === 0;

  return (
    <Screen withStackHeader>
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TransitWebShell>
          <View style={styles.adTop}>
            <AdBanner on="home" slot="minibus-search-top" />
          </View>

          <MinibusPlannerCard
            origin={origin}
            destination={destination}
            stops={stops}
            searching={hasSearched && isLoading}
            onOriginChange={setOrigin}
            onDestinationChange={setDestination}
            onSwap={onSwap}
            onSearch={onSearch}
          />

          {source === 'offline' && journeys.length > 0 ? (
            <CachedBadge label={t('minibusOfflineResults')} />
          ) : null}

          {isLoading ? <LoadingState /> : null}

          {showEmpty ? (
            <EmptyState title={t('minibusNoJourneys')} description={t('minibusNoJourneysHint')} />
          ) : null}

          <MinibusJourneyResults
            journeys={journeys}
            linesByCode={linesByCode}
            onJourneyPress={(journey) => {
              setPendingDirections(journey, linesByCode);
              router.push('/minibus/directions');
            }}
          />
        </TransitWebShell>
      </ScrollView>
      <InterstitialOrchestrator
        trigger={interstitialTrigger}
        ready={hasSearched && !isLoading}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: space.md,
    paddingBottom: space['4xl'],
    alignItems: 'center',
  },
  adTop: { marginBottom: space.md },
});
