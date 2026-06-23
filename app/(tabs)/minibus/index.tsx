import { Route, Radio } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/StateView';
import { AdBanner } from '@/features/ads/components/AdBanner';
import { MinibusAttributionFooter } from '@/features/minibus/components/MinibusAttributionFooter';
import { MinibusLineCard } from '@/features/minibus/components/MinibusLineCard';
import { MinibusLineImage } from '@/features/minibus/components/MinibusLineImage';
import { MinibusTariffTable } from '@/features/minibus/components/MinibusTariffTable';
import { useMinibusOffline } from '@/features/minibus/hooks/useMinibusOffline';
import { usePresentInterstitial } from '@/features/ads/hooks/usePresentInterstitial';
import { useMinibusLines, useMinibusTariffs } from '@/features/minibus/hooks/useMinibusQueries';
import {
  isMinibusTrackingAvailable,
  useMinibusTrackingHealth,
} from '@/features/minibus/hooks/useMinibusTrackingHealth';
import { localDocumentImageUri } from '@/features/minibus/offline';
import { buildMinibusDocumentFileUrl } from '@/features/minibus/pdfUrl';
import { resolveEnabledModules } from '@/config/island';
import { useBootstrap } from '@/features/transit/hooks/useTransitQueries';
import { track } from '@/lib/analytics';
import { iconSize, radius, space, typography } from '@/lib/tokens';
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
  const healthQuery = useMinibusTrackingHealth({ enabled: enabled && hubFocused });
  const showLiveTracking = isMinibusTrackingAvailable(healthQuery.data);
  const { presentInterstitial } = usePresentInterstitial();
  const { snapshot } = useMinibusOffline();

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

        <View onLayout={(event) => onSectionLayout('plan', event)}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              track('minibus', 'view', { screen: 'search' });
              router.push('/minibus/search');
            }}
          >
            <Card style={styles.searchCard}>
              <View style={[styles.searchIcon, { backgroundColor: theme.primary }]}>
                <Route size={iconSize.md} color={theme.onPrimary} strokeWidth={2} />
              </View>
              <View style={styles.searchBody}>
                <Text style={[typography.headline, { color: theme.text }]}>{t('minibusPlanRoute')}</Text>
                <Text style={[typography.caption, { color: theme.muted }]}>
                  {t('minibusPlanRouteHint')}
                </Text>
              </View>
            </Card>
          </Pressable>

          {showLiveTracking ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void (async () => {
                  track('minibus', 'live_entry_open', { source: 'hub' });
                  await presentInterstitial('live_entry');
                  router.push('/minibus/live');
                })();
              }}
            >
              <Card style={styles.searchCard}>
                <View style={[styles.searchIcon, { backgroundColor: theme.accent }]}>
                  <Radio size={iconSize.md} color={theme.onAccent} strokeWidth={2} />
                </View>
                <View style={styles.searchBody}>
                  <Text style={[typography.headline, { color: theme.text }]}>{t('minibusLiveCta')}</Text>
                  <Text style={[typography.caption, { color: theme.muted }]}>
                    {t('minibusLiveCtaHint')}
                  </Text>
                </View>
              </Card>
            </Pressable>
          ) : null}
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
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginBottom: space.md,
  },
  searchIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBody: { flex: 1, gap: 2 },
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
