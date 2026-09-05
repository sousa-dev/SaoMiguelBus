import { useCallback } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { CloudOff } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { ErrorState, LoadingState } from '@/components/ui/StateView';
import { ScreenTopAdBanner } from '@/features/ads/components/ScreenTopAdBanner';
import { MinibusAttributionFooter } from '@/features/minibus/components/MinibusAttributionFooter';
import { MinibusTariffTable } from '@/features/minibus/components/MinibusTariffTable';
import { trackMinibusView } from '@/features/minibus/lib/live-analytics';
import { useMinibusOffline } from '@/features/minibus/hooks/useMinibusOffline';
import { useMinibusTariffs } from '@/features/minibus/hooks/useMinibusQueries';
import { useNetwork } from '@/lib/network-provider';
import { space } from '@/lib/tokens';

/**
 * Fare tables on their own route, mirroring the transit tab's prices screen:
 * the hub links here instead of inlining the table, and the page itself stays
 * a table, never a computed fare (schedules are not in the data yet, so "what
 * will this ride cost?" cannot be answered honestly).
 */
export default function MinibusPricesScreen() {
  const { t } = useTranslation();
  const { isOnline } = useNetwork();

  useFocusEffect(
    useCallback(() => {
      trackMinibusView('prices');
    }, []),
  );

  const tariffsQuery = useMinibusTariffs();
  const { snapshot } = useMinibusOffline();

  // Offline bundle wins when present — same rule every other MiniBus screen uses.
  const tariffs = tariffsQuery.data?.tariffs ?? snapshot?.bundle?.tariffs ?? null;
  const effectiveDate =
    tariffsQuery.data?.tariffs_effective_date ??
    snapshot?.bundle?.tariffs_effective_date ??
    null;
  const sourceUrl = tariffsQuery.data?.source_url ?? snapshot?.bundle?.source_url ?? null;
  const importedAt = tariffsQuery.data?.imported_at ?? snapshot?.bundle?.imported_at ?? null;

  const loading = tariffsQuery.isLoading && !tariffs;
  const error = tariffsQuery.isError && !tariffs;

  return (
    <Screen withStackHeader>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenTopAdBanner embedded />

        {loading ? <LoadingState /> : null}

        {error ? (
          <ErrorState
            title={t('minibusLoadError')}
            actionLabel={t('commonRetry')}
            onAction={() => void tariffsQuery.refetch()}
          />
        ) : null}

        {!loading && !error && !tariffs && !isOnline ? (
          <ErrorState icon={CloudOff} title={t('minibusLoadError')} />
        ) : null}

        {tariffs ? <MinibusTariffTable tariffs={tariffs} effectiveDate={effectiveDate} /> : null}

        <MinibusAttributionFooter sourceUrl={sourceUrl} importedAt={importedAt} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.md },
});
