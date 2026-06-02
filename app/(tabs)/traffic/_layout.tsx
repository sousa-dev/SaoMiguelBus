import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { SettingsHeaderButton } from '@/components/SettingsHeaderButton';
import { useAppStackScreenOptions } from '@/lib/navigation';

export default function TrafficLayout() {
  const { t } = useTranslation();
  const screenOptions = useAppStackScreenOptions();

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen
        name="index"
        options={{ title: t('navBarTrafficLabel'), headerRight: () => <SettingsHeaderButton /> }}
      />
      <Stack.Screen name="[id]" options={{ title: t('trafficDetailTitle') }} />
      <Stack.Screen name="new" options={{ title: t('trafficReportTitle'), presentation: 'modal' }} />
    </Stack>
  );
}
