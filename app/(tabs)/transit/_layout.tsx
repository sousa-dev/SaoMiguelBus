import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { SettingsHeaderButton } from '@/components/SettingsHeaderButton';
import { useAppStackScreenOptions } from '@/lib/navigation';

export default function TransitLayout() {
  const { t } = useTranslation();
  const screenOptions = useAppStackScreenOptions();

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen
        name="index"
        options={{
          title: t('navBarSearchLabel'),
          headerRight: () => <SettingsHeaderButton />,
        }}
      />
      <Stack.Screen name="directions" options={{ title: t('directionsButton') }} />
      <Stack.Screen name="[tripId]" options={{ title: t('routeDetails') }} />
    </Stack>
  );
}
