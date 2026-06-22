import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useModuleRootHeaderOptions } from '@/components/AppHeaderActions';
import { ModuleStackScreenLayout } from '@/features/ads/components/ModuleStackScreenLayout';
import { useAppStackScreenOptions } from '@/lib/navigation';

export default function ToursLayout() {
  const { t } = useTranslation();
  const screenOptions = useAppStackScreenOptions();
  const moduleRootHeader = useModuleRootHeaderOptions();

  return (
    <Stack screenOptions={screenOptions} screenLayout={ModuleStackScreenLayout}>
      <Stack.Screen
        name="index"
        options={{
          title: t('navBarToursLabel'),
          ...moduleRootHeader,
        }}
      />
      <Stack.Screen name="[tourId]" options={{ title: t('tourDetailTitle') }} />
    </Stack>
  );
}
