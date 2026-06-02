import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@/lib/theme';

export default function EarthquakesLayout() {
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.primary },
        headerTintColor: '#fff',
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: t('navBarEarthquakesLabel') }} />
      <Stack.Screen name="[id]" options={{ title: t('seismicDetailTitle') }} />
    </Stack>
  );
}
