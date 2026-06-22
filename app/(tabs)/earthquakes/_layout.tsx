import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useModuleRootHeaderOptions } from '@/components/AppHeaderActions';
import { ModuleStackScreenLayout } from '@/features/ads/components/ModuleStackScreenLayout';
import { useAppStackScreenOptions } from '@/lib/navigation';

export default function EarthquakesLayout() {
  const { t } = useTranslation();
  const screenOptions = useAppStackScreenOptions();
  const moduleRootHeader = useModuleRootHeaderOptions();

  return (
    <Stack screenOptions={screenOptions} screenLayout={ModuleStackScreenLayout}>
      <Stack.Screen
        name="index"
        options={{
          title: t('navBarEarthquakesLabel'),
          ...moduleRootHeader,
        }}
      />
      <Stack.Screen name="[id]" options={{ title: t('seismicDetailTitle') }} />
    </Stack>
  );
}
