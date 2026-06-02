import { ArrowRight, Bus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateView';
import { DirectionsResults } from '@/features/transit/components/DirectionsResults';
import { TransitWebShell } from '@/features/transit/components/TransitWebShell';
import { useDirections } from '@/features/transit/hooks/useTransitQueries';
import { elevation, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

export default function DirectionsScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    origin?: string;
    destination?: string;
    day?: string;
    start?: string;
  }>();

  const origin = params.origin ?? '';
  const destination = params.destination ?? '';
  const day = params.day ?? 'weekday';
  const start = params.start ?? '08h00';

  const directions = useDirections({
    origin,
    destination,
    day,
    start,
    enabled: Boolean(origin && destination),
  });

  const empty =
    !directions.isLoading &&
    !directions.isError &&
    directions.data &&
    (!directions.data.routes?.length || directions.data.routes.length === 0);

  return (
    <Screen withStackHeader>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TransitWebShell>
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

          {directions.isLoading ? <LoadingState title={t('searchButton')} /> : null}

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

          {directions.data && !empty ? (
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
  },
  endpoints: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  arrow: { marginHorizontal: space.xs },
});
