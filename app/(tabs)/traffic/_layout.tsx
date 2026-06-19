import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { SettingsHeaderButton } from '@/components/SettingsHeaderButton';
import { SidebarHeaderButton } from '@/components/SidebarHeaderButton';
import { stackBackScreenOptions } from '@/components/StackBackButton';
import { ModuleStackScreenLayout } from '@/features/ads/components/ModuleStackScreenLayout';
import { useAppStackScreenOptions } from '@/lib/navigation';

export default function TrafficLayout() {
  const { t } = useTranslation();
  const screenOptions = useAppStackScreenOptions();

  return (
    <Stack screenOptions={screenOptions} screenLayout={ModuleStackScreenLayout}>
      <Stack.Screen
        name="index"
        options={{
          title: t('homeTrafficTitle'),
          headerLeft: () => <SidebarHeaderButton />,
          headerRight: () => <SettingsHeaderButton />,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: t('trafficDetailTitle'),
          ...stackBackScreenOptions('/(tabs)/traffic'),
        }}
      />
      <Stack.Screen
        name="new"
        options={{
          title: t('trafficReportTitle'),
          presentation: 'modal',
          ...stackBackScreenOptions('/(tabs)/traffic'),
        }}
      />
    </Stack>
  );
}
