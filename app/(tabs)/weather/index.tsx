import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import { type Href, useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateView';
import { ParishWeatherCard } from '@/features/weather/components/ParishWeatherCard';
import { ParishWeatherGridCard } from '@/features/weather/components/ParishWeatherGridCard';
import { ParishWeatherGridRow } from '@/features/weather/components/ParishWeatherGridRow';
import { WeatherToolbar } from '@/features/weather/components/WeatherToolbar';
import {
  chunkParishesIntoGridRows,
  filterParishes,
  groupParishesByConcelho,
  orderPinnedParishes,
  uniqueConcelhos,
  type WeatherGridRow,
  type WeatherViewMode,
} from '@/features/weather/filterHelpers';
import { useWeatherParishes } from '@/features/weather/hooks/useWeatherQueries';
import { useWeatherStore, WEATHER_PIN_CAP } from '@/features/weather/weather-store';
import { staticIslandConfig } from '@/config/island';
import { useBootstrap } from '@/features/transit/hooks/useTransitQueries';
import { track } from '@/lib/analytics';
import type { ParishWeather } from '@/lib/types';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

const GRID_COLUMNS = 4;

type ListSection = { title: string; data: ParishWeather[] };
type GridSection = { title: string; data: WeatherGridRow[] };

export default function WeatherScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { data: bootstrap } = useBootstrap();
  const modules = bootstrap?.island?.enabledModules ?? staticIslandConfig.enabledModules;
  const showWeather = modules.includes('weather');
  const query = useWeatherParishes(showWeather);

  const pinnedSlugs = useWeatherStore((s) => s.pinnedSlugs);
  const togglePin = useWeatherStore((s) => s.togglePin);
  const isPinned = useWeatherStore((s) => s.isPinned);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConcelho, setSelectedConcelho] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<WeatherViewMode>('list');

  const allParishes = query.data?.parishes ?? [];

  const concelhos = useMemo(() => uniqueConcelhos(allParishes), [allParishes]);

  const filtered = useMemo(
    () => filterParishes(allParishes, { query: searchQuery, concelho: selectedConcelho }),
    [allParishes, searchQuery, selectedConcelho],
  );

  const pinnedParishes = useMemo(
    () => orderPinnedParishes(filtered, pinnedSlugs),
    [filtered, pinnedSlugs],
  );

  const unpinnedParishes = useMemo(
    () => filtered.filter((p) => !pinnedSlugs.includes(p.slug)),
    [filtered, pinnedSlugs],
  );

  const concelhoGroups = useMemo(() => groupParishesByConcelho(unpinnedParishes), [unpinnedParishes]);

  const listSections: ListSection[] = concelhoGroups;

  const gridSections: GridSection[] = useMemo(
    () =>
      concelhoGroups.map((section) => ({
        title: section.title,
        data: chunkParishesIntoGridRows(section.data, GRID_COLUMNS),
      })),
    [concelhoGroups],
  );

  const handleTogglePin = useCallback(
    (parish: ParishWeather) => {
      const wasPinned = isPinned(parish.slug);
      const ok = togglePin(parish.slug);
      if (!ok) {
        track('weather', 'pin_blocked', { cap: WEATHER_PIN_CAP });
        return;
      }
      track('weather', 'pin_toggle', { slug: parish.slug, pinned: !wasPinned });
    },
    [togglePin, isPinned],
  );

  const openParish = useCallback(
    (slug: string) => {
      router.push(`/weather/${slug}` as Href);
    },
    [router],
  );

  useFocusEffect(
    useCallback(() => {
      if (!showWeather) {
        return;
      }
      void query.refetch();
      track('weather', 'view', { screen: 'list' });
    }, [showWeather, query.refetch]),
  );

  const onRefresh = useCallback(() => {
    void query.refetch();
  }, [query.refetch]);

  const toolbar = (
    <WeatherToolbar
      theme={theme}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      concelhos={concelhos}
      selectedConcelho={selectedConcelho}
      onSelectConcelho={setSelectedConcelho}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
    />
  );

  const renderListCard = useCallback(
    (item: ParishWeather, compact?: boolean) => (
      <ParishWeatherCard
        parish={item}
        theme={theme}
        isPinned={isPinned(item.slug)}
        onTogglePin={() => handleTogglePin(item)}
        onPress={() => openParish(item.slug)}
        compact={compact}
      />
    ),
    [theme, isPinned, handleTogglePin, openParish],
  );

  const pinnedBlock = useMemo(() => {
    if (pinnedParishes.length === 0) {
      return null;
    }
    return (
      <View style={styles.pinnedBlock}>
        <Text style={[styles.pinnedLabel, { color: theme.text }]}>{t('weatherPinnedSection')}</Text>
        {viewMode === 'list' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {pinnedParishes.map((p) => (
              <View key={p.slug}>{renderListCard(p, true)}</View>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.gridPinnedRow}>
            {pinnedParishes.map((p) => (
              <View key={p.slug} style={styles.gridCell}>
                <ParishWeatherGridCard
                  parish={p}
                  theme={theme}
                  isPinned
                  onTogglePin={() => handleTogglePin(p)}
                  onPress={() => openParish(p.slug)}
                />
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }, [pinnedParishes, viewMode, theme, t, renderListCard, handleTogglePin, openParish]);

  const listHeader = useMemo(
    () => (
      <View>
        <Text style={[styles.subtitle, { color: theme.muted }]}>{t('weatherSubtitle')}</Text>
        {toolbar}
        {pinnedBlock}
      </View>
    ),
    [theme, t, toolbar, pinnedBlock],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: { title: string } }) => (
      <Text style={[styles.sectionHeader, { color: theme.text, backgroundColor: theme.background }]}>
        {section.title}
      </Text>
    ),
    [theme],
  );

  if (!showWeather) {
    return null;
  }

  const hasResults = filtered.length > 0;
  const isGrid = viewMode === 'grid';

  const attributionFooter = hasResults ? (
    <Text style={[styles.attribution, { color: theme.muted }]}>{t('weatherAttribution')}</Text>
  ) : null;

  return (
    <Screen withStackHeader>
      {query.isLoading && !query.data ? (
        <View style={styles.skeletons}>
          {toolbar}
          <CardSkeleton />
          <CardSkeleton />
        </View>
      ) : null}

      {query.isError ? (
        <View style={styles.skeletons}>
          {toolbar}
          <ErrorState
            title={t('weatherLoadError')}
            actionLabel={t('commonRetry')}
            onAction={() => void query.refetch()}
          />
        </View>
      ) : null}

      {!query.isLoading && !query.isError && !hasResults ? (
        <View style={styles.skeletons}>
          {listHeader}
          <EmptyState title={t('weatherNoResultsTitle')} description={t('weatherNoResultsMessage')} />
        </View>
      ) : null}

      {!query.isLoading && !query.isError && hasResults && isGrid ? (
        <SectionList
          key="grid"
          sections={gridSections}
          keyExtractor={(row) => row.key}
          ListHeaderComponent={listHeader}
          refreshControl={
            <RefreshControl refreshing={query.isFetching} onRefresh={onRefresh} tintColor={theme.primary} />
          }
          renderSectionHeader={renderSectionHeader}
          renderItem={({ item }) => (
            <ParishWeatherGridRow
              row={item}
              theme={theme}
              isPinned={isPinned}
              onTogglePin={handleTogglePin}
              onPressParish={openParish}
            />
          )}
          ListFooterComponent={attributionFooter}
          stickySectionHeadersEnabled
          contentContainerStyle={styles.listContent}
        />
      ) : null}

      {!query.isLoading && !query.isError && hasResults && !isGrid ? (
        <SectionList
          key="list"
          sections={listSections}
          keyExtractor={(item) => item.slug}
          ListHeaderComponent={listHeader}
          refreshControl={
            <RefreshControl refreshing={query.isFetching} onRefresh={onRefresh} tintColor={theme.primary} />
          }
          renderSectionHeader={renderSectionHeader}
          renderItem={({ item }) => renderListCard(item)}
          ListFooterComponent={attributionFooter}
          stickySectionHeadersEnabled
          contentContainerStyle={styles.listContent}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { ...typography.body, marginBottom: space.md },
  skeletons: { paddingHorizontal: space.lg, paddingBottom: space.xl },
  pinnedBlock: { marginBottom: space.md },
  pinnedLabel: { ...typography.label, fontWeight: '700', marginBottom: space.sm },
  sectionHeader: {
    ...typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    paddingVertical: space.sm,
    marginTop: space.xs,
  },
  listContent: { paddingHorizontal: space.lg, paddingBottom: space.xl },
  attribution: { fontSize: 10, textAlign: 'center', marginTop: space.lg, marginBottom: space.md },
  gridCell: { flex: 1, maxWidth: '25%', paddingHorizontal: 2 },
  gridPinnedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
});
