import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useModuleRootHeaderOptions } from '@/components/AppHeaderActions';
import { ModuleStackScreenLayout } from '@/features/ads/components/ModuleStackScreenLayout';
import { useAppStackScreenOptions } from '@/lib/navigation';

export default function MarketplaceLayout() {
  const { t } = useTranslation();
  const screenOptions = useAppStackScreenOptions();
  const moduleRootHeader = useModuleRootHeaderOptions();

  return (
    <Stack screenOptions={screenOptions} screenLayout={ModuleStackScreenLayout}>
      <Stack.Screen
        name="index"
        options={{
          title: t('navBarMarketplaceLabel'),
          ...moduleRootHeader,
        }}
      />
      <Stack.Screen name="[id]" options={{ title: t('marketplaceDetailTitle') }} />
      <Stack.Screen name="new" options={{ title: t('marketplaceAddListing'), presentation: 'modal' }} />
      <Stack.Screen name="edit/[id]" options={{ title: t('marketplaceEditListing'), presentation: 'modal' }} />
    </Stack>
  );
}
