import { Stack } from 'expo-router';

import { useAppStackScreenOptions } from '@/lib/navigation';

export default function MarketplaceAdminLayout() {
  const screenOptions = useAppStackScreenOptions();

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" />
      <Stack.Screen name="provider/[id]" />
      <Stack.Screen name="review/[id]" />
      <Stack.Screen name="category/[id]" />
    </Stack>
  );
}
