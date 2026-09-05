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
      {/* `search` is intentionally unregistered: the file is a redirect stub
          for old deep links, and never renders long enough to need options. */}
      <Stack.Screen name="directions" options={stackBackScreenOptions('/(tabs)/minibus')} />
      <Stack.Screen name="prices" options={stackBackScreenOptions('/(tabs)/minibus')} />
      <Stack.Screen name="network" options={stackBackScreenOptions('/(tabs)/minibus')} />
      <Stack.Screen name="live" options={stackBackScreenOptions('/(tabs)/minibus')} />
      <Stack.Screen name="[slug]" options={stackBackScreenOptions('/(tabs)/minibus')} />
      <Stack.Screen name="pdf" options={stackBackScreenOptions('/(tabs)/minibus')} />
      <Stack.Screen name="schematic" options={stackBackScreenOptions('/(tabs)/minibus')} />
    </Stack>
  );
}
