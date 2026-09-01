import { Stack } from 'expo-router';

import { useModuleRootHeaderOptions } from '@/components/AppHeaderActions';
import { stackBackScreenOptions } from '@/components/StackBackButton';
import { useAppStackScreenOptions } from '@/lib/navigation';

export default function TransitLayout() {
  const screenOptions = useAppStackScreenOptions();
  const moduleRootHeader = useModuleRootHeaderOptions();

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={moduleRootHeader} />
      <Stack.Screen
        name="directions"
        options={stackBackScreenOptions('/(tabs)/transit')}
      />
      <Stack.Screen
        name="prices"
        options={stackBackScreenOptions('/(tabs)/transit')}
      />
      <Stack.Screen
        name="map"
        options={stackBackScreenOptions('/(tabs)/transit')}
      />
      <Stack.Screen
        name="network"
        options={stackBackScreenOptions('/(tabs)/transit')}
      />
      <Stack.Screen
        name="live"
        options={stackBackScreenOptions('/(tabs)/transit')}
      />
      <Stack.Screen
        name="line/[code]"
        options={stackBackScreenOptions('/(tabs)/transit')}
      />
      <Stack.Screen
        name="stop/[stopId]"
        options={stackBackScreenOptions('/(tabs)/transit')}
      />
      <Stack.Screen
        name="[tripId]"
        options={stackBackScreenOptions('/(tabs)/transit')}
      />
    </Stack>
  );
}
