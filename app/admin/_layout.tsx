import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '@/lib/auth-store';
import { useAppStackScreenOptions } from '@/lib/navigation';

export default function AdminLayout() {
  const screenOptions = useAppStackScreenOptions();
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.token);
  const isSuperuser = useAuthStore((s) => s.user?.isSuperuser);

  if (hydrated && (!token || !isSuperuser)) {
    return <Redirect href="/settings" />;
  }

  return <Stack screenOptions={screenOptions} />;
}
