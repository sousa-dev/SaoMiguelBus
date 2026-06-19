import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { SettingsHeaderButton } from '@/components/SettingsHeaderButton';
import { SidebarHeaderButton } from '@/components/SidebarHeaderButton';
import { useAppStackScreenOptions } from '@/lib/navigation';

export default function MinibusLayout() {
  const { t } = useTranslation();
  const screenOptions = useAppStackScreenOptions();

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen
        name="index"
        options={{
          title: t('navBarMinibusLabel'),
          headerLeft: () => <SidebarHeaderButton />,
          headerRight: () => <SettingsHeaderButton />,
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
