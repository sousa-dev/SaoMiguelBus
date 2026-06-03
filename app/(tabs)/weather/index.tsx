import { useCallback, useMemo } from 'react';
import { RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { type Href, useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateView';
import { ParishWeatherCard } from '@/features/weather/components/ParishWeatherCard';
import { useWeatherParishes } from '@/features/weather/hooks/useWeatherQueries';
import { staticIslandConfig } from '@/config/island';
import { useBootstrap } from '@/features/transit/hooks/useTransitQueries';
import { track } from '@/lib/analytics';
import type { ParishWeather } from '@/lib/types';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Section = { title: string; data: ParishWeather[] };

export default function WeatherScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { data: bootstrap } = useBootstrap();
  const modules = bootstrap?.island?.enabledModules ?? staticIslandConfig.enabledModules;
  const showWeather = modules.includes('weather');
  const query = useWeatherParishes(showWeather);

  const sections: Section[] = useMemo(() => {
    const parishes = query.data?.parishes ?? [];
    const byConcelho = new Map<string, ParishWeather[]>();
    for (const p of parishes) {
      const list = byConcelho.get(p.concelho) ?? [];
      list.push(p);
      byConcelho.set(p.concelho, list);
    }
    return Array.from(byConcelho.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'pt'))
      .map(([title, data]) => ({
        title,
        data: [...data].sort((x, y) => x.name.localeCompare(y.name, 'pt')),
      }));
  }, [query.data?.parishes]);

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

  if (!showWeather) {
    return null;
  }

  return (
    <Screen>
      <Text style={[styles.subtitle, { color: theme.muted }]}>{t('weatherSubtitle')}</Text>

      {query.isLoading && !query.data ? (
        <View style={styles.skeletons}>
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </View>
      ) : null}

      {query.isError ? (
        <ErrorState
          title={t('weatherLoadError')}
          actionLabel={t('commonRetry')}
          onAction={() => void query.refetch()}
        />
      ) : null}

      {!query.isLoading && !query.isError && sections.length === 0 ? (
        <EmptyState title={t('weatherEmptyTitle')} description={t('weatherEmptyMessage')} />
      ) : null}

      {sections.length > 0 ? (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.slug}
          refreshControl={
            <RefreshControl refreshing={query.isFetching} onRefresh={onRefresh} tintColor={theme.primary} />
          }
          renderSectionHeader={({ section }) => (
            <Text style={[styles.sectionHeader, { color: theme.text, backgroundColor: theme.background }]}>
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => (
            <ParishWeatherCard
              parish={item}
              theme={theme}
              onPress={() => router.push(`/weather/${item.slug}` as Href)}
            />
          )}
          ListFooterComponent={
            query.data?.attribution ? (
              <Text style={[styles.attribution, { color: theme.muted }]}>{query.data.attribution}</Text>
            ) : null
          }
          stickySectionHeadersEnabled
          contentContainerStyle={styles.listContent}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { ...typography.body, marginBottom: space.md },
  skeletons: { gap: space.sm },
  sectionHeader: {
    ...typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    paddingVertical: space.sm,
    marginTop: space.xs,
  },
  listContent: { paddingBottom: space.xl },
  attribution: { fontSize: 10, textAlign: 'center', marginTop: space.lg, marginBottom: space.md },
});
