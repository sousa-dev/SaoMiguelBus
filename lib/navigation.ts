import { Platform, StyleSheet } from 'react-native';

import { space } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

/** Screens that use iOS large titles (list roots). None enabled — compact headers everywhere. */
export const LARGE_TITLE_SCREENS = new Set<string>();

export function useAppStackScreenOptions(screenName?: string) {
  const theme = useAppTheme();
  const largeTitle =
    Platform.OS === 'ios' && screenName != null && LARGE_TITLE_SCREENS.has(screenName);

  return {
    headerStyle: {
      backgroundColor: theme.surface,
      ...(theme.isDark
        ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.divider }
        : {}),
    },
    headerTintColor: theme.onSurface,
    headerTitleStyle: { fontWeight: '600' as const, color: theme.onSurface },
    headerShadowVisible: !theme.isDark,
    headerBackTitleVisible: false,
    headerBackVisible: true,
    headerLeftContainerStyle: { paddingLeft: space.md },
    headerLargeTitle: largeTitle,
    headerLargeTitleStyle: { color: theme.onSurface },
    gestureEnabled: true,
    fullScreenGestureEnabled: true,
    contentStyle: { backgroundColor: theme.background },
  };
}
