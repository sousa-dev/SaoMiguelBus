import { Stack } from 'expo-router';

import { useModuleRootHeaderOptions } from '@/components/AppHeaderActions';
import { ModuleStackScreenLayout } from '@/features/ads/components/ModuleStackScreenLayout';
import { useAppStackScreenOptions } from '@/lib/navigation';

export default function MarketplaceLayout() {
  const screenOptions = useAppStackScreenOptions();
  const moduleRootHeader = useModuleRootHeaderOptions();

  return (
    <Stack screenOptions={screenOptions} screenLayout={ModuleStackScreenLayout}>
      <Stack.Screen name="index" options={moduleRootHeader} />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="edit/[id]" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
