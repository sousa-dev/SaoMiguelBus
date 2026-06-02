import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { SettingsHeaderButton } from '@/components/SettingsHeaderButton';
import { useAppStackScreenOptions } from '@/lib/navigation';

export default function EarthquakesLayout() {
  const { t } = useTranslation();
  const screenOptions = useAppStackScreenOptions();

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen
        name="index"
        options={{ title: t('navBarEarthquakesLabel'), headerRight: () => <SettingsHeaderButton /> }}
      />
      <Stack.Screen name="[id]" options={{ title: t('seismicDetailTitle') }} />
    </Stack>
  );
}
