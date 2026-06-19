import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { SettingsHeaderButton } from '@/components/SettingsHeaderButton';
import { SidebarHeaderButton } from '@/components/SidebarHeaderButton';
import { ModuleStackScreenLayout } from '@/features/ads/components/ModuleStackScreenLayout';
import { useAppStackScreenOptions } from '@/lib/navigation';

export default function WeatherLayout() {
  const { t } = useTranslation();
  const screenOptions = useAppStackScreenOptions();

  return (
    <Stack screenOptions={screenOptions} screenLayout={ModuleStackScreenLayout}>
      <Stack.Screen
        name="index"
        options={{
          title: t('navBarWeatherLabel'),
          headerLeft: () => <SidebarHeaderButton />,
          headerRight: () => <SettingsHeaderButton />,
        }}
      />
      <Stack.Screen name="[slug]" options={{ title: t('weatherDetailTitle') }} />
    </Stack>
  );
}
