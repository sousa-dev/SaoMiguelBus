import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { SettingsHeaderButton } from '@/components/SettingsHeaderButton';
import { SidebarHeaderButton } from '@/components/SidebarHeaderButton';
import { StackBackButton } from '@/components/StackBackButton';
import { useAppStackScreenOptions } from '@/lib/navigation';

export default function TrafficLayout() {
  const { t } = useTranslation();
  const screenOptions = useAppStackScreenOptions();

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen
        name="index"
        options={{
          title: t('navBarTrafficLabel'),
          headerLeft: () => <SidebarHeaderButton />,
          headerRight: () => <SettingsHeaderButton />,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: t('trafficDetailTitle'),
          headerLeft: () => <StackBackButton fallbackHref="/(tabs)/traffic" />,
        }}
      />
      <Stack.Screen
        name="new"
        options={{
          title: t('trafficReportTitle'),
          presentation: 'modal',
          headerLeft: () => <StackBackButton fallbackHref="/(tabs)/traffic" />,
        }}
      />
    </Stack>
  );
}
