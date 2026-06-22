import { Stack } from 'expo-router';

import { useModuleRootHeaderOptions } from '@/components/AppHeaderActions';
import { useAppStackScreenOptions } from '@/lib/navigation';

export default function MinibusLayout() {
  const screenOptions = useAppStackScreenOptions();
  const moduleRootHeader = useModuleRootHeaderOptions();

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={moduleRootHeader} />
      <Stack.Screen name="search" />
      <Stack.Screen name="directions" />
      <Stack.Screen name="[slug]" />
      <Stack.Screen name="pdf" />
      <Stack.Screen name="schematic" />
    </Stack>
  );
}
