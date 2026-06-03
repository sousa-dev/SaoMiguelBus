import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { SettingsHeaderButton } from '@/components/SettingsHeaderButton';
import { useAppStackScreenOptions } from '@/lib/navigation';

export default function WeatherLayout() {
  const { t } = useTranslation();
  const screenOptions = useAppStackScreenOptions();

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen
        name="index"
        options={{ title: t('navBarWeatherLabel'), headerRight: () => <SettingsHeaderButton /> }}
      />
      <Stack.Screen name="[slug]" options={{ title: t('weatherDetailTitle') }} />
    </Stack>
  );
}
