import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@/lib/theme';

export default function TrailsLayout() {
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
      <Stack.Screen name="index" options={{ title: t('navBarTrailsLabel') }} />
      <Stack.Screen name="[id]" options={{ title: t('trailsDetailTitle') }} />
    </Stack>
  );
}
