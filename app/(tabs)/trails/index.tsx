import React, { useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { TrailCard } from '@/features/trails/components/TrailCard';
import { useTrails } from '@/features/trails/hooks/useTrailQueries';
import { staticIslandConfig } from '@/config/island';
import { useBootstrap } from '@/features/transit/hooks/useTransitQueries';
import { track } from '@/lib/analytics';
import { useAppTheme } from '@/lib/theme';

export default function TrailsScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { data: bootstrap } = useBootstrap();
  const modules = bootstrap?.island?.enabledModules ?? staticIslandConfig.enabledModules;
  const showTrails = modules.includes('trails');
  const trails = useTrails(showTrails);

  useFocusEffect(
    useCallback(() => {
      if (!showTrails) {
        return;
      }
      void trails.refetch();
      track('trails', 'view', { screen: 'list' });
    }, [showTrails, trails.refetch]),
  );

  const onRefresh = useCallback(() => {
    void trails.refetch();
  }, [trails.refetch]);

  if (!showTrails) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {trails.isLoading ? <ActivityIndicator color={theme.primary} /> : null}
      {trails.isError ? (
        <Text style={{ color: theme.muted }}>{t('trailsLoadError')}</Text>
      ) : null}

      <FlatList
        data={trails.data?.trails ?? []}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl
            refreshing={trails.isRefetching}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          !trails.isLoading ? (
            <Text style={{ color: theme.muted, textAlign: 'center', marginTop: 24 }}>
              {t('trailsEmpty')}
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <TrailCard
            trail={item}
            theme={theme}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/trails/[id]',
                params: { id: String(item.id) },
              })
            }
          />
        )}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  list: { paddingBottom: 24 },
});
