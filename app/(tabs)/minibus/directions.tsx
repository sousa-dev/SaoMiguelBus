import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { ErrorState } from '@/components/ui/StateView';
import { MinibusDirectionsSteps } from '@/features/minibus/components/MinibusDirectionsSteps';
import { MinibusJourneyMap } from '@/features/minibus/components/MinibusJourneyMap';
import { consumePendingDirections } from '@/features/minibus/directionsStore';
import { track } from '@/lib/analytics';
import { space } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

export default function MinibusDirectionsScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const pendingRef = useRef(consumePendingDirections());
  const pending = pendingRef.current;
  const trackedRef = useRef(false);

  useEffect(() => {
    if (!pending || trackedRef.current) {
      return;
    }
    trackedRef.current = true;
    track('minibus', 'view', {
      screen: 'directions',
      transfers: pending.journey.transfers,
    });
  }, [pending]);

  if (!pending) {
    return (
      <Screen withStackHeader>
        <ErrorState title={t('minibusLoadError')} />
      </Screen>
    );
  }

  const { journey } = pending;

  return (
    <Screen withStackHeader>
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
      >
        <MinibusJourneyMap journey={journey} />
        <MinibusDirectionsSteps journey={journey} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xl },
});
