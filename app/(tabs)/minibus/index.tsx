import { Route } from 'lucide-react-native';
import { useCallback, useEffect } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { Card } from '@/components/ui/Card';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/StateView';
import { MinibusAttributionFooter } from '@/features/minibus/components/MinibusAttributionFooter';
import { MinibusLineCard } from '@/features/minibus/components/MinibusLineCard';
import { MinibusTariffTable } from '@/features/minibus/components/MinibusTariffTable';
import { useMinibusOffline } from '@/features/minibus/hooks/useMinibusOffline';
import { useMinibusLines, useMinibusTariffs } from '@/features/minibus/hooks/useMinibusQueries';
import { resolveEnabledModules, staticIslandConfig } from '@/config/island';
import { useBootstrap } from '@/features/transit/hooks/useTransitQueries';
import { track } from '@/lib/analytics';
import { iconSize, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

export default function MinibusScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { data: bootstrap } = useBootstrap();
  const modules = resolveEnabledModules(bootstrap?.island?.enabledModules);
  const enabled = modules.includes('minibus');

  const linesQuery = useMinibusLines(enabled);
  const tariffsQuery = useMinibusTariffs(enabled);
  const { snapshot } = useMinibusOffline();

  useFocusEffect(
    useCallback(() => {
      if (!enabled) {
        return;
      }
      track('minibus', 'view', { screen: 'list' });
      void linesQuery.refetch();
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

  const loading = linesQuery.isLoading && !lines;
  const error = linesQuery.isError && !lines;

  return (
    <Screen withStackHeader>
      <ScrollView
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
        <Text style={[typography.body, { color: theme.muted, marginBottom: space.md }]}>
          {t('minibusSubtitle')}
        </Text>

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
            {lines.map((line) => (
              <MinibusLineCard
                key={line.slug}
                line={line}
                onPress={() => router.push(`/minibus/${line.slug}`)}
              />
            ))}

            {tariffs ? (
              <MinibusTariffTable tariffs={tariffs} effectiveDate={effectiveDate} />
            ) : null}

            <MinibusAttributionFooter sourceUrl={sourceUrl} importedAt={importedAt} />
          </>
        ) : null}
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
});
