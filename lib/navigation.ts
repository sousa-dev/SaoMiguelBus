import { useAppTheme } from '@/lib/theme';

/** Shared Expo Router Stack screenOptions (green header, white tint). */
export function useAppStackScreenOptions() {
  const theme = useAppTheme();
  return {
    headerStyle: { backgroundColor: theme.primary },
    headerTintColor: '#fff' as const,
    headerShadowVisible: false,
    headerBackVisible: true,
    gestureEnabled: true,
    fullScreenGestureEnabled: true,
    contentStyle: { backgroundColor: theme.background },
  };
}
