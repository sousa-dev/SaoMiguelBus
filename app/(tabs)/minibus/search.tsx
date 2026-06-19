import { ArrowUpDown } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { Button } from '@/components/ui/Button';
import { CachedBadge } from '@/components/ui/CachedBadge';
import { IconButton } from '@/components/ui/IconButton';
import { EmptyState, LoadingState } from '@/components/ui/StateView';
import { MinibusJourneyCard } from '@/features/minibus/components/MinibusJourneyCard';
import { MinibusStopPicker } from '@/features/minibus/components/MinibusStopPicker';
import { useMinibusOffline } from '@/features/minibus/hooks/useMinibusOffline';
import { useMinibusLines, useMinibusNetwork } from '@/features/minibus/hooks/useMinibusQueries';
import { useMinibusRouteSearch } from '@/features/minibus/hooks/useMinibusRouteSearch';
import { track } from '@/lib/analytics';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

export default function MinibusSearchScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();

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
      >
        <Text style={[typography.body, { color: theme.muted, marginBottom: space.md }]}>
          {t('minibusSearchSubtitle')}
        </Text>

        <View style={styles.form}>
          <MinibusStopPicker
            label={t('minibusOrigin')}
            value={origin}
            placeholder={t('minibusStopPlaceholder')}
            stops={stops}
            onChangeText={setOrigin}
          />
          <View style={styles.swapRow}>
            <IconButton
              icon={ArrowUpDown}
              variant="ghost"
              size="sm"
              color={theme.primary}
              accessibilityLabel={t('minibusSwap')}
              onPress={onSwap}
            />
          </View>
          <MinibusStopPicker
            label={t('minibusDestination')}
            value={destination}
            placeholder={t('minibusStopPlaceholder')}
            stops={stops}
            onChangeText={setDestination}
          />
          <Button
            label={t('minibusSearchCta')}
            fullWidth
            onPress={onSearch}
            disabled={!origin.trim() || !destination.trim()}
          />
        </View>

        {source === 'offline' && journeys.length > 0 ? (
          <View style={styles.cachedRow}>
            <CachedBadge label={t('minibusOfflineResults')} />
          </View>
        ) : null}

        {isLoading ? <LoadingState /> : null}

        {showEmpty ? (
          <EmptyState title={t('minibusNoJourneys')} description={t('minibusNoJourneysHint')} />
        ) : null}

        {journeys.map((journey, index) => (
          <MinibusJourneyCard key={`journey-${index}`} journey={journey} linesByCode={linesByCode} />
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xl },
  form: { gap: space.sm, marginBottom: space.lg },
  swapRow: { alignItems: 'center' },
  cachedRow: { marginBottom: space.sm },
});
