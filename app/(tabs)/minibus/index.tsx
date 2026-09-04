import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { Chip } from '@/components/ui/Chip';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/StateView';
import { AdBanner } from '@/features/ads/components/AdBanner';
import { MinibusAttributionFooter } from '@/features/minibus/components/MinibusAttributionFooter';
import { MinibusLiveHubCard } from '@/features/minibus/components/MinibusLiveHubCard';
import { MinibusPlanRouteLink } from '@/features/minibus/components/MinibusPlanRouteLink';
import { MinibusLineCard } from '@/features/minibus/components/MinibusLineCard';
import { MinibusLineImage } from '@/features/minibus/components/MinibusLineImage';
import { MinibusTariffTable } from '@/features/minibus/components/MinibusTariffTable';
import { useMinibusOffline } from '@/features/minibus/hooks/useMinibusOffline';
import {
  useMinibusLines,
  useMinibusNetwork,
  useMinibusTariffs,
} from '@/features/minibus/hooks/useMinibusQueries';
import { useOpenMinibusLiveTracking } from '@/features/minibus/hooks/useOpenMinibusLiveTracking';
import { useLiveVehicleCounts } from '@/features/live-tracking/hooks/useLiveVehicleCounts';
import { resolveLiveCount } from '@/features/live-tracking/lib/liveCounts';
import { isLiveEntryEnabled } from '@/features/live-tracking/lib/liveEntryVisibility';
import { useLiveTrackingDevStore } from '@/features/live-tracking/lib/live-tracking-dev-store';
import { localDocumentImageUri } from '@/features/minibus/offline';
import { buildMinibusDocumentFileUrl } from '@/features/minibus/pdfUrl';
import { resolveEnabledModules } from '@/config/island';
import { useBootstrap } from '@/features/transit/hooks/useTransitQueries';
import { track } from '@/lib/analytics';
import { useNetwork } from '@/lib/network-provider';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type MinibusSection = 'plan' | 'lines' | 'pricing';

const SECTIONS: Array<{ key: MinibusSection; labelKey: string }> = [
  { key: 'plan', labelKey: 'minibusSectionPlanRoute' },
  { key: 'lines', labelKey: 'minibusSectionLines' },
  { key: 'pricing', labelKey: 'minibusSectionPricing' },
];

export default function MinibusScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Partial<Record<MinibusSection, number>>>({});
  const [activeSection, setActiveSection] = useState<MinibusSection>('plan');

  const { data: bootstrap } = useBootstrap();
  const modules = resolveEnabledModules(bootstrap?.island?.enabledModules);
  const enabled = modules.includes('minibus');

  const [hubFocused, setHubFocused] = useState(false);

  const linesQuery = useMinibusLines(enabled);
  const tariffsQuery = useMinibusTariffs(enabled);
  const { isOnline } = useNetwork();
  // The hub's ONLY tracking-related request: a cached count, never a vendor
  // call by itself (see `GET /api/v3/transit/live-counts`). The live map
  // screen still probes health for real -- its polling is what keeps this
  // cache warm for everyone else.
  const liveCounts = useLiveVehicleCounts({ enabled: enabled && hubFocused });
  const minibusLive = resolveLiveCount(liveCounts.data?.minibus);
  // Always shown once the module itself is enabled -- an outage explains
  // itself on the live screen rather than making the entry disappear.
  const forceLiveTrackingUnavailable = useLiveTrackingDevStore((s) => s.forceUnavailable);
  const liveEntryEnabled =
    isLiveEntryEnabled(isOnline, minibusLive.available) && !forceLiveTrackingUnavailable;
  const { openLiveTracking } = useOpenMinibusLiveTracking();
  const { snapshot } = useMinibusOffline();

  // Total stops for the plan-route row's subtitle, mirroring the transit tab's
  // "Mapa da Rede" stop count. Offline bundle wins when present, same rule the
  // search screen uses for its own stop picker.
  const offlineNetwork = snapshot?.bundle?.network ?? null;
  const networkQuery = useMinibusNetwork(enabled && !offlineNetwork);
  const network = offlineNetwork ?? networkQuery.data ?? null;
  const stopsCount = useMemo(() => {
    if (!network) {
      return undefined;
    }
    const seen = new Set<string>();
    for (const line of network.lines) {
      for (const stop of line.stops) {
        seen.add(stop.name_pt);
      }
    }
    return seen.size;
  }, [network]);

  useFocusEffect(
    useCallback(() => {
      if (!enabled) {
        return;
      }
      setHubFocused(true);
      track('minibus', 'view', { screen: 'list' });
      void linesQuery.refetch();
      return () => {
        setHubFocused(false);
      };
    }, [enabled, linesQuery.refetch]),
  );

  useEffect(() => {
    if (!enabled) {
      router.replace('/transit');
    }
  }, [enabled, router]);

  const onRefresh = useCallback(() => {
    void linesQuery.refetch();
    void tariffsQuery.refetch();
  }, [linesQuery.refetch, tariffsQuery.refetch]);

  const lines = linesQuery.data?.lines ?? snapshot?.bundle?.lines ?? null;
  const tariffs = tariffsQuery.data?.tariffs ?? snapshot?.bundle?.tariffs ?? null;
  const sourceUrl = linesQuery.data?.source_url ?? snapshot?.bundle?.source_url ?? null;
  const importedAt = linesQuery.data?.imported_at ?? snapshot?.bundle?.imported_at ?? null;
  const effectiveDate =
    tariffsQuery.data?.tariffs_effective_date ?? snapshot?.bundle?.tariffs_effective_date ?? null;

  const networkMapLocalUri = localDocumentImageUri(snapshot, 'network-map');
  const networkMapRemoteUrl =
    snapshot?.bundle?.network_map?.url ?? buildMinibusDocumentFileUrl('network-map');

  const loading = linesQuery.isLoading && !lines;
  const error = linesQuery.isError && !lines;

  const onSectionLayout = (section: MinibusSection, event: LayoutChangeEvent) => {
    sectionOffsets.current[section] = event.nativeEvent.layout.y;
  };

  const scrollToSection = (section: MinibusSection) => {
    setActiveSection(section);
    const y = sectionOffsets.current[section];
    if (y == null) {
      return;
    }
    scrollRef.current?.scrollTo({ y: Math.max(0, y - space.sm), animated: true });
  };

  return (
    <Screen withStackHeader>
      <ScrollView
        ref={scrollRef}
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={linesQuery.isFetching || tariffsQuery.isFetching}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
      >
        <View style={styles.adTop}>
          <AdBanner on="home" slot="minibus-list-top" />
        </View>

        <View style={styles.pillsRow}>
          {SECTIONS.map((section) => (
            <Chip
              key={section.key}
              label={t(section.labelKey)}
              selected={activeSection === section.key}
              onPress={() => scrollToSection(section.key)}
            />
          ))}
        </View>

        <Text style={[typography.body, { color: theme.muted, marginBottom: space.md }]}>
          {t('minibusSubtitle')}
        </Text>

        {/* Plan route and "Ao vivo" share one row, same pairing as the transit
            tab's network-map / live-tracking row. Each half stretches to fill
            when the other is absent -- there is none today, but the layout
            costs nothing to keep consistent. */}
        <View onLayout={(event) => onSectionLayout('plan', event)} style={styles.planLiveRow}>
          <View style={styles.planLiveCell}>
            <MinibusPlanRouteLink
              stopsCount={stopsCount}
              onPress={() => {
                track('minibus', 'view', { screen: 'search' });
                router.push('/minibus/search');
              }}
            />
          </View>
          <View style={styles.planLiveCell}>
            <MinibusLiveHubCard
              enabled={liveEntryEnabled}
              isOnline={isOnline}
              vehicleCount={minibusLive.count}
              onPress={() => {
                void openLiveTracking({ source: 'hub' });
              }}
            />
          </View>
        </View>

        <View onLayout={(event) => onSectionLayout('lines', event)} style={styles.section}>
          <Text style={[typography.headline, { color: theme.text, marginBottom: space.sm }]}>
            {t('minibusSectionLines')}
          </Text>

          <MinibusLineImage
            compact
            documentSlug="network-map"
            localUri={networkMapLocalUri}
            remoteUrl={networkMapRemoteUrl}
            sectionTitle={t('minibusNetworkMap')}
            accessibilityLabel={t('minibusNetworkMapImageAlt')}
            tapHintKey="minibusNetworkMapTapToZoom"
            fullscreenA11yKey="minibusNetworkMapOpenFullscreen"
          />

          {loading ? (
            <View style={styles.skeletons}>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </View>
          ) : null}

          {error ? (
            <ErrorState
              title={t('minibusLoadError')}
              actionLabel={t('commonRetry')}
              onAction={() => void linesQuery.refetch()}
            />
          ) : null}

          {!loading && !error && lines ? (
            <>
              <View style={styles.lineList}>
                {lines.map((line) => (
                  <MinibusLineCard
                    key={line.slug}
                    line={line}
                    onPress={() => router.push(`/minibus/${line.slug}`)}
                  />
                ))}
              </View>

              <View style={styles.adInline}>
                <AdBanner on="home" slot="minibus-list-inline-0" />
              </View>
            </>
          ) : null}
        </View>

        {!loading && !error && tariffs ? (
          <View onLayout={(event) => onSectionLayout('pricing', event)} style={styles.section}>
            <MinibusTariffTable tariffs={tariffs} effectiveDate={effectiveDate} />
          </View>
        ) : null}

        <MinibusAttributionFooter sourceUrl={sourceUrl} importedAt={importedAt} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xl },
  skeletons: { gap: space.sm },
  planLiveRow: {
    flexDirection: 'row',
    gap: space.sm,
    alignSelf: 'stretch',
  },
  planLiveCell: { flex: 1 },
  lineList: { gap: space.md },
  section: { marginTop: space.lg },
  adTop: { marginBottom: space.md },
  adInline: { marginTop: space.md },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: space.md,
  },
});
