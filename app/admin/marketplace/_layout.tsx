import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAppStackScreenOptions } from '@/lib/navigation';

export default function MarketplaceAdminLayout() {
  const { t } = useTranslation();
  const screenOptions = useAppStackScreenOptions();

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ title: t('marketplaceAdminTitle') }} />
      <Stack.Screen name="provider/[id]" options={{ title: t('marketplaceAdminEditProvider') }} />
      <Stack.Screen name="review/[id]" options={{ title: t('marketplaceAdminEditReview') }} />
      <Stack.Screen name="category/[id]" options={{ title: t('marketplaceAdminEditCategory') }} />
    </Stack>
  );
}
