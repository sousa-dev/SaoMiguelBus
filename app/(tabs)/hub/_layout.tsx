import { Stack } from 'expo-router';

import { useModuleRootHeaderOptions } from '@/components/AppHeaderActions';
import { useAppStackScreenOptions } from '@/lib/navigation';

export default function HubLayout() {
  const screenOptions = useAppStackScreenOptions();
  const moduleRootHeader = useModuleRootHeaderOptions();

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={moduleRootHeader} />
    </Stack>
  );
}
