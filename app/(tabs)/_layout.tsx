import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import {
  Bus,
  CalendarDays,
  LayoutGrid,
  Mountain,
  Newspaper,
  ShoppingBag,
  TrafficCone,
  Waves,
} from 'lucide-react-native';
import { useCallback } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { resolveEnabledModules } from '@/config/island';
import { useBootstrap } from '@/features/transit/hooks/useTransitQueries';
import { elevation } from '@/lib/tokens';
import { logger } from '@/lib/logger';
import { useAppTheme } from '@/lib/theme';

function TabBarBackground() {
  const theme = useAppTheme();
  if (Platform.OS === 'ios') {
    return <BlurView intensity={80} tint={theme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />;
  }
  return null;
}

export default function TabLayout() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { data: bootstrap, refetch } = useBootstrap();
  const modules = resolveEnabledModules(bootstrap?.island?.enabledModules);
  const showHub = true;
  const showTransit = modules.includes('transit');
  const showNews = modules.includes('news');
  const showSeismic = modules.includes('seismic');
  const showTrails = modules.includes('trails');
  const showMarketplace = modules.includes('marketplace');
  const showTraffic = modules.includes('traffic');
  const showTours = modules.includes('events');

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  if (__DEV__) {
    logger.debug('tab modules', modules.join(','));
  }

  const tabBarStyle =
    Platform.OS === 'android'
      ? { backgroundColor: theme.surface, borderTopColor: theme.border, ...elevation(2, theme.text) }
      : { backgroundColor: 'transparent', borderTopColor: theme.border, position: 'absolute' as const };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.muted,
        tabBarStyle,
        tabBarBackground: Platform.OS === 'ios' ? () => <TabBarBackground /> : undefined,
        headerStyle: { backgroundColor: theme.primary },
        headerTintColor: theme.headerTint,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="hub"
        options={{
          title: t('hubTabLabel'),
          href: showHub ? '/hub' : null,
          tabBarIcon: ({ color, size }) => <LayoutGrid color={color} size={size} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="transit"
        options={{
          title: t('navBarSearchLabel'),
          href: showTransit ? '/transit' : null,
          tabBarIcon: ({ color, size }) => <Bus color={color} size={size} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          title: t('navBarNewsLabel'),
          href: showNews ? '/news' : null,
          tabBarIcon: ({ color, size }) => <Newspaper color={color} size={size} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="earthquakes"
        options={{
          title: t('navBarEarthquakesLabel'),
          href: showSeismic ? '/earthquakes' : null,
          tabBarIcon: ({ color, size }) => <Waves color={color} size={size} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="trails"
        options={{
          title: t('navBarTrailsLabel'),
          href: showTrails ? '/trails' : null,
          tabBarIcon: ({ color, size }) => <Mountain color={color} size={size} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: t('navBarMarketplaceLabel'),
          href: showMarketplace ? '/marketplace' : null,
          tabBarIcon: ({ color, size }) => <ShoppingBag color={color} size={size} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="traffic"
        options={{
          title: t('navBarTrafficLabel'),
          href: showTraffic ? '/traffic' : null,
          tabBarIcon: ({ color, size }) => <TrafficCone color={color} size={size} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="tours"
        options={{
          title: t('navBarToursLabel'),
          href: showTours ? '/tours' : null,
          tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} strokeWidth={2} />,
        }}
      />
    </Tabs>
  );
}
