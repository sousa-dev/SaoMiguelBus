import { Stack } from 'expo-router';

import { stackBackScreenOptions } from '@/components/StackBackButton';
import { useAppStackScreenOptions } from '@/lib/navigation';

export default function MarketplaceAdminLayout() {
  const screenOptions = useAppStackScreenOptions();

  return (
    <Stack screenOptions={screenOptions}>
      {/* Admin lives off /settings, which is where it is reached from. */}
      <Stack.Screen name="index" options={stackBackScreenOptions('/settings')} />
      <Stack.Screen
        name="provider/[id]"
        options={stackBackScreenOptions('/admin/marketplace')}
      />
      <Stack.Screen
        name="review/[id]"
        options={stackBackScreenOptions('/admin/marketplace')}
      />
      <Stack.Screen
        name="category/[id]"
        options={stackBackScreenOptions('/admin/marketplace')}
      />
    </Stack>
  );
}
