import { Tabs } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { staticIslandConfig } from '@/config/island';
import { useBootstrap } from '@/features/transit/hooks/useTransitQueries';
import { logger } from '@/lib/logger';
import { useAppTheme } from '@/lib/theme';

export default function TabLayout() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { data: bootstrap, refetch } = useBootstrap();
  const modules = bootstrap?.island?.enabledModules ?? staticIslandConfig.enabledModules;
  const showTransit = modules.includes('transit');
  const showNews = modules.includes('news');
  const showSeismic = modules.includes('seismic');
  const showTrails = modules.includes('trails');

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  if (__DEV__) {
    logger.debug('tab modules', modules.join(','));
  }

  return (
    <Tabs
      key={modules.join('-')}
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.muted,
        headerStyle: { backgroundColor: theme.primary },
        headerTintColor: '#fff',
      }}
    >
      <Tabs.Screen
        name="transit"
        options={{
          title: t('navBarSearchLabel'),
          headerShown: false,
          href: showTransit ? '/transit' : null,
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          title: t('navBarNewsLabel'),
          headerShown: false,
          href: showNews ? '/news' : null,
        }}
      />
      <Tabs.Screen
        name="earthquakes"
        options={{
          title: t('navBarEarthquakesLabel'),
          headerShown: false,
          href: showSeismic ? '/earthquakes' : null,
        }}
      />
      <Tabs.Screen
        name="trails"
        options={{
          title: t('navBarTrailsLabel'),
          headerShown: false,
          href: showTrails ? '/trails' : null,
        }}
      />
    </Tabs>
  );
}
