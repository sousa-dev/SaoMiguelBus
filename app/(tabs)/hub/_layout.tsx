import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useModuleRootHeaderOptions } from '@/components/AppHeaderActions';
import { useAppStackScreenOptions } from '@/lib/navigation';

export default function HubLayout() {
  const { t } = useTranslation();
  const screenOptions = useAppStackScreenOptions();
  const moduleRootHeader = useModuleRootHeaderOptions();

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen
        name="index"
        options={{
          title: t('hubTitle'),
          ...moduleRootHeader,
        }}
      />
    </Stack>
  );
}
