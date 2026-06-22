import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useModuleRootHeaderOptions } from '@/components/AppHeaderActions';
import { stackBackScreenOptions } from '@/components/StackBackButton';
import { ModuleStackScreenLayout } from '@/features/ads/components/ModuleStackScreenLayout';
import { useAppStackScreenOptions } from '@/lib/navigation';

export default function TrafficLayout() {
  const { t } = useTranslation();
  const screenOptions = useAppStackScreenOptions();
  const moduleRootHeader = useModuleRootHeaderOptions();

  return (
    <Stack screenOptions={screenOptions} screenLayout={ModuleStackScreenLayout}>
      <Stack.Screen
        name="index"
        options={{
          title: t('homeTrafficTitle'),
          ...moduleRootHeader,
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
