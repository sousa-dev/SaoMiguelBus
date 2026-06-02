import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { staticIslandConfig } from '@/config/island';
import { useBootstrap } from '@/features/transit/hooks/useTransitQueries';
import { useAppTheme } from '@/lib/theme';

export default function TabLayout() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { data: bootstrap } = useBootstrap();
  const modules = bootstrap?.island?.enabledModules ?? staticIslandConfig.enabledModules;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.muted,
        headerStyle: { backgroundColor: theme.primary },
        headerTintColor: '#fff',
      }}
    >
      {modules.includes('transit') ? (
        <Tabs.Screen
          name="transit"
          options={{
            title: t('navBarSearchLabel'),
            headerShown: false,
          }}
        />
      ) : null}
      {modules.includes('news') ? (
        <Tabs.Screen
          name="news"
          options={{
            title: t('navBarNewsLabel'),
            headerShown: false,
          }}
        />
      ) : null}
    </Tabs>
  );
}
