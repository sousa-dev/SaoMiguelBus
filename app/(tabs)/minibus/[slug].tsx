import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { Button } from '@/components/ui/Button';
import { ErrorState, LoadingState } from '@/components/ui/StateView';
import { AdBanner } from '@/features/ads/components/AdBanner';
import { MinibusAttributionFooter } from '@/features/minibus/components/MinibusAttributionFooter';
import { MinibusLineImage } from '@/features/minibus/components/MinibusLineImage';
import {
  MinibusLineMap,
  type MinibusLineMapHandle,
} from '@/features/minibus/components/MinibusLineMap';
import { MinibusLineStopsList } from '@/features/minibus/components/MinibusLineStopsList';
import { useMinibusOffline } from '@/features/minibus/hooks/useMinibusOffline';
import { useMinibusLine, useMinibusNetwork } from '@/features/minibus/hooks/useMinibusQueries';
import {
  isMinibusTrackingAvailable,
  useMinibusTrackingHealth,
} from '@/features/minibus/hooks/useMinibusTrackingHealth';
import { localLineImageUri } from '@/features/minibus/offline';
import { formatServiceSummary } from '@/features/minibus/serviceSummary';
import { track } from '@/lib/analytics';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

export default function MinibusLineDetailScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const lineQuery = useMinibusLine(slug, Boolean(slug));
  const healthQuery = useMinibusTrackingHealth({ enabled: Boolean(slug) });
  const showLiveTracking = isMinibusTrackingAvailable(healthQuery.data);
  const { snapshot } = useMinibusOffline();
  const offlineNetwork = snapshot?.bundle?.network ?? null;
  const networkQuery = useMinibusNetwork(!offlineNetwork);
  const network = offlineNetwork ?? networkQuery.data ?? null;
  const scrollRef = useRef<ScrollView>(null);
  const mapRef = useRef<MinibusLineMapHandle>(null);
  const [mapScrollY, setMapScrollY] = useState(0);
  const [highlightedStopKey, setHighlightedStopKey] = useState<string | null>(null);

  // Offline-aware: fall back to the cached snapshot line when the query has no data.
  const cachedLine = snapshot?.bundle?.lines.find((l) => l.slug === slug) ?? null;
  const line = lineQuery.data ?? cachedLine;
  const networkLine = line ? network?.lines.find((row) => row.slug === line.slug) ?? null : null;
  const stops = networkLine?.stops ?? [];

  useEffect(() => {
    if (line) {
      track('minibus', 'view', { screen: 'line', line: line.code });
    }
  }, [line?.code]);

  useEffect(() => {
    if (stops.length > 0 && line) {
      track('minibus', 'view', { screen: 'line_map', line: line.code });
    }
  }, [line?.code, stops.length]);

  const onStopPress = (stopKey: string) => {
    setHighlightedStopKey(stopKey);
    scrollRef.current?.scrollTo({ y: Math.max(0, mapScrollY - space.md), animated: true });
    requestAnimationFrame(() => {
      mapRef.current?.focusStop(stopKey);
    });
    if (line) {
      track('minibus', 'view', { screen: 'line_map_stop', line: line.code, stop: stopKey });
    }
  };

  if (!line) {
    return (
      <Screen withStackHeader>
        {lineQuery.isLoading ? <LoadingState /> : <ErrorState title={t('minibusLoadError')} />}
      </Screen>
    );
  }

  const sourceUrl = lineQuery.data?.source_url ?? snapshot?.bundle?.source_url ?? null;
  const importedAt = lineQuery.data?.imported_at ?? snapshot?.bundle?.imported_at ?? null;
  const localUri = localLineImageUri(snapshot, line.slug);

  return (
    <Screen withStackHeader>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        style={{ backgroundColor: theme.background }}
      >
        <View style={styles.adTop}>
          <AdBanner on="home" slot="minibus-line-top" />
        </View>

        <View style={[styles.colorBar, { backgroundColor: line.color }]} />
        <Text style={[typography.title, { color: theme.text }]}>{line.name}</Text>
        <Text style={[typography.body, { color: theme.muted, marginTop: space.sm }]}>
          {formatServiceSummary(line.service_summary, t)}
        </Text>

        {showLiveTracking ? (
          <Button
            variant="secondary"
            label={t('minibusLiveTracking')}
            onPress={() => {
              track('minibus', 'live_entry_open', { source: 'line_detail', line: line.code });
              router.push(`/minibus/live?line=${encodeURIComponent(line.slug)}`);
            }}
            style={{ marginTop: space.md }}
          />
        ) : null}

        <MinibusLineStopsList
          stops={stops}
          lineColor={line.color}
          selectedStopKey={highlightedStopKey}
          onStopPress={onStopPress}
        />

        <View onLayout={(event) => setMapScrollY(event.nativeEvent.layout.y)}>
          <MinibusLineMap
            ref={mapRef}
            stops={stops}
            lineColor={line.color}
            lineCode={line.code}
            routeShapes={line.route_shapes}
            highlightedStopKey={highlightedStopKey}
          />
        </View>

        <MinibusLineImage
          documentSlug={line.slug}
          localUri={localUri}
          remoteUrl={line.timetable_file_url}
          sectionTitle={t('minibusTimetable')}
          sectionTitleStyle={[typography.headline, { color: theme.text, marginTop: space.lg }]}
          accessibilityLabel={t('minibusTimetableImageAlt', { line: line.name })}
        />

        <MinibusAttributionFooter sourceUrl={sourceUrl} importedAt={importedAt} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xl },
  colorBar: { width: 48, height: 6, borderRadius: 3, marginBottom: space.md },
  adTop: { marginBottom: space.md },
});
