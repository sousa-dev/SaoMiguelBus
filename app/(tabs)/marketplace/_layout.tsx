import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { SettingsHeaderButton } from '@/components/SettingsHeaderButton';
import { useAppStackScreenOptions } from '@/lib/navigation';

export default function MarketplaceLayout() {
  const { t } = useTranslation();
  const screenOptions = useAppStackScreenOptions();

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen
        name="index"
        options={{ title: t('navBarMarketplaceLabel'), headerRight: () => <SettingsHeaderButton /> }}
      />
      <Stack.Screen name="[id]" options={{ title: t('marketplaceDetailTitle') }} />
      <Stack.Screen name="new" options={{ title: t('marketplaceAddListing'), presentation: 'modal' }} />
      <Stack.Screen name="edit/[id]" options={{ title: t('marketplaceEditListing'), presentation: 'modal' }} />
    </Stack>
  );
}
