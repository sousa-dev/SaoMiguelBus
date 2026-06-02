import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@/lib/theme';

export default function MarketplaceLayout() {
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
      <Stack.Screen name="index" options={{ title: t('navBarMarketplaceLabel') }} />
      <Stack.Screen name="[id]" options={{ title: t('marketplaceDetailTitle') }} />
      <Stack.Screen name="new" options={{ title: t('marketplaceAddListing'), presentation: 'modal' }} />
      <Stack.Screen name="edit/[id]" options={{ title: t('marketplaceEditListing'), presentation: 'modal' }} />
    </Stack>
  );
}
