import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { SettingsHeaderButton } from '@/components/SettingsHeaderButton';
import { useAppStackScreenOptions } from '@/lib/navigation';

export default function TrailsLayout() {
  const { t } = useTranslation();
  const screenOptions = useAppStackScreenOptions();

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen
        name="index"
        options={{ title: t('navBarTrailsLabel'), headerRight: () => <SettingsHeaderButton /> }}
      />
      <Stack.Screen name="[id]" options={{ title: t('trailsDetailTitle') }} />
    </Stack>
  );
}
