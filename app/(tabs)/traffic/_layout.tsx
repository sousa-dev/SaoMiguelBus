import { Stack } from 'expo-router';

import { useModuleRootHeaderOptions } from '@/components/AppHeaderActions';
import { stackBackScreenOptions } from '@/components/StackBackButton';
import { ModuleStackScreenLayout } from '@/features/ads/components/ModuleStackScreenLayout';
import { useAppStackScreenOptions } from '@/lib/navigation';

export default function TrafficLayout() {
  const screenOptions = useAppStackScreenOptions();
  const moduleRootHeader = useModuleRootHeaderOptions();

  return (
    <Stack screenOptions={screenOptions} screenLayout={ModuleStackScreenLayout}>
      <Stack.Screen name="index" options={moduleRootHeader} />
      <Stack.Screen
        name="[id]"
        options={stackBackScreenOptions('/(tabs)/traffic')}
      />
      <Stack.Screen
        name="new"
        options={{
          presentation: 'modal',
          ...stackBackScreenOptions('/(tabs)/traffic'),
        }}
      />
    </Stack>
  );
}
