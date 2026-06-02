import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { SettingsHeaderButton } from '@/components/SettingsHeaderButton';
import { useAppStackScreenOptions } from '@/lib/navigation';

export default function HubLayout() {
  const { t } = useTranslation();
  const screenOptions = useAppStackScreenOptions('hub/index');

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen
        name="index"
        options={{
          title: t('hubTitle'),
          headerLargeTitle: true,
          headerRight: () => <SettingsHeaderButton />,
        }}
      />
    </Stack>
  );
}
