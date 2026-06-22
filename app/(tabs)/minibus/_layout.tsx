import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useModuleRootHeaderOptions } from '@/components/AppHeaderActions';
import { useAppStackScreenOptions } from '@/lib/navigation';

export default function MinibusLayout() {
  const { t } = useTranslation();
  const screenOptions = useAppStackScreenOptions();
  const moduleRootHeader = useModuleRootHeaderOptions();

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen
        name="index"
        options={{
          title: t('navBarMinibusLabel'),
          ...moduleRootHeader,
        }}
      />
      <Stack.Screen name="search" options={{ title: t('minibusSearchTitle') }} />
      <Stack.Screen name="directions" options={{ title: t('minibusDirectionsTitle') }} />
      <Stack.Screen name="[slug]" options={{ title: t('minibusLineDetail') }} />
      <Stack.Screen name="pdf" options={{ title: t('minibusPdfTitle') }} />
      <Stack.Screen name="schematic" options={{ title: t('minibusSchematic') }} />
    </Stack>
  );
}
