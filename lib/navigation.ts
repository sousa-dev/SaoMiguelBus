import { Platform } from 'react-native';

import { useAppTheme } from '@/lib/theme';

/** Screens that use iOS large titles (list roots). */
export const LARGE_TITLE_SCREENS = new Set([
  'index',
  'hub/index',
  'transit/index',
  'news/index',
  'earthquakes/index',
  'trails/index',
  'marketplace/index',
  'traffic/index',
  'tours/index',
]);

export function useAppStackScreenOptions(screenName?: string) {
  const theme = useAppTheme();
  const largeTitle =
    Platform.OS === 'ios' && screenName != null && LARGE_TITLE_SCREENS.has(screenName);

  return {
    headerStyle: { backgroundColor: theme.primary },
    headerTintColor: theme.headerTint,
    headerTitleStyle: { fontWeight: '600' as const },
    headerShadowVisible: false,
    headerBackVisible: true,
    headerLargeTitle: largeTitle,
    headerLargeTitleStyle: { color: theme.headerTint },
    gestureEnabled: true,
    fullScreenGestureEnabled: true,
    contentStyle: { backgroundColor: theme.background },
  };
}
