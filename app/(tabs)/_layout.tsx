import { Tabs, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import type { ColorValue } from 'react-native';
import { useTranslation } from 'react-i18next';

import { HubTabBar } from '@/components/HubTabBar';
import { resolveEnabledModules, type ModuleKey } from '@/config/island';
import { useLiveTabBadges } from '@/features/hub/hooks/useLiveTabBadges';
import { useBootstrap } from '@/features/transit/hooks/useTransitQueries';
import { useHubStore } from '@/lib/hub-store';
import { logger } from '@/lib/logger';
import { HUB_MODULES, HUB_TAB } from '@/lib/modules';
import { useAppTheme } from '@/lib/theme';

const SCREEN_MODULE_KEY: Record<string, ModuleKey> = {
  transit: 'transit',
  news: 'news',
  earthquakes: 'seismic',
  trails: 'trails',
  marketplace: 'marketplace',
  traffic: 'traffic',
  tours: 'events',
  weather: 'weather',
};

function TabBarIcon({
  Icon,
  color,
  size,
}: {
  Icon: typeof HUB_TAB.Icon;
  color: ColorValue;
  size: number;
}) {
  return <Icon color={color} size={size} strokeWidth={2} />;
}

export default function TabLayout() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { data: bootstrap, refetch } = useBootstrap();
  const modules = resolveEnabledModules(bootstrap?.island?.enabledModules);
  const pinnedKeys = useHubStore((s) => s.pinnedKeys);
  const badgeCounts = useLiveTabBadges(modules, pinnedKeys);

  const isEnabled = useCallback((key: ModuleKey) => modules.includes(key), [modules]);

  const tabHref = useCallback(
    (screenName: string) => {
      const moduleKey = SCREEN_MODULE_KEY[screenName];
      if (!moduleKey) {
        return null;
      }
      const mod = HUB_MODULES.find((m) => m.key === moduleKey);
      if (!mod || !isEnabled(moduleKey) || !pinnedKeys.includes(moduleKey)) {
        return null;
      }
      return mod.route;
    },
    [isEnabled, pinnedKeys],
  );

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
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.onSurfaceMuted,
        headerShown: false,
      }}
      tabBar={(props) => (
        <HubTabBar
          state={props.state}
          descriptors={props.descriptors as import('@/components/HubTabBar').HubTabBarProps['descriptors']}
          navigation={props.navigation as import('@/components/HubTabBar').HubTabBarProps['navigation']}
          pinnedKeys={pinnedKeys}
          enabledKeys={modules}
          badgeCounts={badgeCounts}
        />
      )}
    >
      <Tabs.Screen
        name="hub"
        options={{
          title: t(HUB_TAB.labelKey),
          headerShown: false,
          href: HUB_TAB.route,
          tabBarIcon: ({ color, size }) => <TabBarIcon Icon={HUB_TAB.Icon} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="transit"
        options={{
          title: t('navBarSearchLabel'),
          headerShown: false,
          href: tabHref('transit'),
          tabBarIcon: ({ color, size }) => {
            const mod = HUB_MODULES.find((m) => m.key === 'transit');
            return mod ? <TabBarIcon Icon={mod.Icon} color={color} size={size} /> : null;
          },
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          title: t('navBarNewsLabel'),
          headerShown: false,
          href: tabHref('news'),
          tabBarIcon: ({ color, size }) => {
            const mod = HUB_MODULES.find((m) => m.key === 'news');
            return mod ? <TabBarIcon Icon={mod.Icon} color={color} size={size} /> : null;
          },
        }}
      />
      <Tabs.Screen
        name="earthquakes"
        options={{
          title: t('navBarEarthquakesLabel'),
          headerShown: false,
          href: tabHref('earthquakes'),
          tabBarIcon: ({ color, size }) => {
            const mod = HUB_MODULES.find((m) => m.key === 'seismic');
            return mod ? <TabBarIcon Icon={mod.Icon} color={color} size={size} /> : null;
          },
        }}
      />
      <Tabs.Screen
        name="trails"
        options={{
          title: t('navBarTrailsLabel'),
          headerShown: false,
          href: tabHref('trails'),
          tabBarIcon: ({ color, size }) => {
            const mod = HUB_MODULES.find((m) => m.key === 'trails');
            return mod ? <TabBarIcon Icon={mod.Icon} color={color} size={size} /> : null;
          },
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: t('navBarMarketplaceLabel'),
          headerShown: false,
          href: tabHref('marketplace'),
          tabBarIcon: ({ color, size }) => {
            const mod = HUB_MODULES.find((m) => m.key === 'marketplace');
            return mod ? <TabBarIcon Icon={mod.Icon} color={color} size={size} /> : null;
          },
        }}
      />
      <Tabs.Screen
        name="traffic"
        options={{
          title: t('homeTrafficTitle'),
          headerShown: false,
          href: tabHref('traffic'),
          tabBarIcon: ({ color, size }) => {
            const mod = HUB_MODULES.find((m) => m.key === 'traffic');
            return mod ? <TabBarIcon Icon={mod.Icon} color={color} size={size} /> : null;
          },
        }}
      />
      <Tabs.Screen
        name="tours"
        options={{
          title: t('navBarToursLabel'),
          headerShown: false,
          href: tabHref('tours'),
          tabBarIcon: ({ color, size }) => {
            const mod = HUB_MODULES.find((m) => m.key === 'events');
            return mod ? <TabBarIcon Icon={mod.Icon} color={color} size={size} /> : null;
          },
        }}
      />
      <Tabs.Screen
        name="weather"
        options={{
          title: t('navBarWeatherLabel'),
          headerShown: false,
          href: tabHref('weather'),
          tabBarIcon: ({ color, size }) => {
            const mod = HUB_MODULES.find((m) => m.key === 'weather');
            return mod ? <TabBarIcon Icon={mod.Icon} color={color} size={size} /> : null;
          },
        }}
      />
    </Tabs>
  );
}
