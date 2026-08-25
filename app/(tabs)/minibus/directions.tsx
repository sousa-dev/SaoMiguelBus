import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { ErrorState } from '@/components/ui/StateView';
import { ScreenTopAdBanner } from '@/features/ads/components/ScreenTopAdBanner';
import { MinibusDirectionsSteps } from '@/features/minibus/components/MinibusDirectionsSteps';
import {
  MinibusJourneyMap,
  type MinibusJourneyMapHandle,
} from '@/features/minibus/components/MinibusJourneyMap';
import { consumePendingDirections } from '@/features/minibus/directionsStore';
import { useMinibusOffline } from '@/features/minibus/hooks/useMinibusOffline';
import { useMinibusNetwork } from '@/features/minibus/hooks/useMinibusQueries';
import { enrichJourneyCoordinates } from '@/features/minibus/stopCoordinates';
import { minibusJourneyAnalyticsProps } from '@/features/minibus/lib/analytics-props';
import { track } from '@/lib/analytics';
import { space } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

export default function MinibusDirectionsScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const pendingRef = useRef(consumePendingDirections());
  const pending = pendingRef.current;
  const trackedRef = useRef(false);
  const mapRef = useRef<MinibusJourneyMapHandle>(null);
  const [highlightedStepKey, setHighlightedStepKey] = useState<string | null>(null);
  const { snapshot } = useMinibusOffline();
  const offlineNetwork = snapshot?.bundle?.network ?? null;
  const networkQuery = useMinibusNetwork(!offlineNetwork);
  const network = offlineNetwork ?? networkQuery.data ?? null;

  const journey = useMemo(
    () => (pending ? enrichJourneyCoordinates(pending.journey, network) : null),
    [network, pending],
  );

  useEffect(() => {
    if (!pending || trackedRef.current) {
      return;
    }
    trackedRef.current = true;
    track('minibus', 'view', {
      screen: 'directions',
      ...minibusJourneyAnalyticsProps(pending.journey),
    });
  }, [pending]);

  const onStepPress = (stepKey: string) => {
    setHighlightedStepKey(stepKey);
    requestAnimationFrame(() => {
      mapRef.current?.focusStep(stepKey);
    });
  };

  if (!pending || !journey) {
    return (
      <Screen withStackHeader>
        <ErrorState title={t('minibusLoadError')} />
      </Screen>
    );
  }

  return (
    <Screen withStackHeader>
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
      >
        <ScreenTopAdBanner embedded />
        <MinibusJourneyMap
          ref={mapRef}
          journey={journey}
          highlightedStepKey={highlightedStepKey}
        />
        <MinibusDirectionsSteps
          journey={journey}
          highlightedStepKey={highlightedStepKey}
          onStepPress={onStepPress}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xl },
});
