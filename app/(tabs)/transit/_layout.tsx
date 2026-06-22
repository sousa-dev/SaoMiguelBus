import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useModuleRootHeaderOptions } from '@/components/AppHeaderActions';
import { stackBackScreenOptions } from '@/components/StackBackButton';
import { useAppStackScreenOptions } from '@/lib/navigation';

export default function TransitLayout() {
  const { t } = useTranslation();
  const screenOptions = useAppStackScreenOptions();
  const moduleRootHeader = useModuleRootHeaderOptions();

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen
        name="index"
        options={{
          headerTitle: '',
          ...moduleRootHeader,
        }}
      />
      <Stack.Screen
        name="directions"
        options={{
          title: t('directionsButton'),
          ...stackBackScreenOptions('/(tabs)/transit'),
        }}
      />
      <Stack.Screen
        name="[tripId]"
        options={{
          title: t('routeDetails'),
          ...stackBackScreenOptions('/(tabs)/transit'),
        }}
      />
    </Stack>
  );
}
