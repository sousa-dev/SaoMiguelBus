import { Stack } from 'expo-router';

import { useModuleRootHeaderOptions } from '@/components/AppHeaderActions';
import { stackBackScreenOptions } from '@/components/StackBackButton';
import { useAppStackScreenOptions } from '@/lib/navigation';

export default function MinibusLayout() {
  const screenOptions = useAppStackScreenOptions();
  const moduleRootHeader = useModuleRootHeaderOptions();

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={moduleRootHeader} />
      <Stack.Screen name="search" options={stackBackScreenOptions('/(tabs)/minibus')} />
      <Stack.Screen name="directions" options={stackBackScreenOptions('/(tabs)/minibus')} />
      <Stack.Screen name="live" options={stackBackScreenOptions('/(tabs)/minibus')} />
      <Stack.Screen name="[slug]" options={stackBackScreenOptions('/(tabs)/minibus')} />
      <Stack.Screen name="pdf" options={stackBackScreenOptions('/(tabs)/minibus')} />
      <Stack.Screen name="schematic" options={stackBackScreenOptions('/(tabs)/minibus')} />
    </Stack>
  );
}
