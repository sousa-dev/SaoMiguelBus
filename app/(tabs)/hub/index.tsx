import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { resolveEnabledModules } from '@/config/island';
import { HomeBusCta } from '@/features/hub/components/home/HomeBusCta';
import { HomeEarthquakesCard } from '@/features/hub/components/home/HomeEarthquakesCard';
import { HomeNewsList } from '@/features/hub/components/home/HomeNewsList';
import { HomePrepareSection } from '@/features/hub/components/home/HomePrepareSection';
import { HomeTrafficCard } from '@/features/hub/components/home/HomeTrafficCard';
import { HomeWeatherCard } from '@/features/hub/components/home/HomeWeatherCard';
import { HomeGreetingHeader } from '@/features/hub/components/HomeGreetingHeader';
import { useHomeData } from '@/features/hub/hooks/useHomeData';
import { useBootstrap } from '@/features/transit/hooks/useTransitQueries';
import { useScrollContentPadding, useStackScrollProps } from '@/lib/stack-scroll';
import { space } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

export default function HubScreen() {
  const theme = useAppTheme();
  const stackScrollProps = useStackScrollProps();
  const bottomPadding = useScrollContentPadding(space['2xl']);
  const { data: bootstrap } = useBootstrap();
  const enabledKeys = resolveEnabledModules(bootstrap?.island?.enabledModules);

  const home = useHomeData(enabledKeys);
  const { weather, seismic, traffic, news, tours, trails } = home;

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    home.refetchAll();
    const timer = setTimeout(() => setRefreshing(false), 800);
    return () => clearTimeout(timer);
  }, [home]);

  const showPrepare = tours.enabled || trails.enabled;

  return (
    <ScrollView
      style={[styles.fill, { backgroundColor: theme.background }]}
      {...stackScrollProps}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
      }
    >
      <HomeGreetingHeader />
      <View style={styles.body}>
        {weather.enabled ? <HomeWeatherCard data={weather} /> : null}
        {seismic.enabled || traffic.enabled ? (
          <View style={styles.splitRow}>
            {seismic.enabled ? (
              <View style={styles.splitCell}>
                <HomeEarthquakesCard data={seismic} />
              </View>
            ) : null}
            {traffic.enabled ? (
              <View style={styles.splitCell}>
                <HomeTrafficCard data={traffic} />
              </View>
            ) : null}
          </View>
        ) : null}
        {news.enabled ? <HomeNewsList data={news} /> : null}
        {showPrepare ? (
          <HomePrepareSection tours={tours} trails={trails} />
        ) : null}
        <HomeBusCta />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingTop: space.xs },
  body: { paddingHorizontal: space.lg },
  splitRow: {
    flexDirection: 'row',
    gap: space.md,
    marginBottom: space.md,
    width: '100%',
  },
  splitCell: {
    flex: 1,
    minWidth: 0,
  },
});
