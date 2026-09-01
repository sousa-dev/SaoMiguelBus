import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as ReactNavigationThemeProvider,
} from 'expo-router';
import React, { useMemo } from 'react';

import { useAppTheme } from '@/lib/theme';

/**
 * Mirrors the app theme into React Navigation's own theme.
 *
 * This is not cosmetic bookkeeping: `useHeaderConfigProps` reads `dark` off THIS
 * theme and forwards it to the native header as `experimental_userInterfaceStyle`,
 * which react-native-screens applies as `navigationBar.overrideUserInterfaceStyle`.
 * Left at the default (light) theme, iOS 26 draws the nav bar's liquid-glass bar
 * button backgrounds light — a light capsule around the hamburger and the
 * profile/settings/Premium group — even on a dark phone with the app set to Dark,
 * because no app-side colour can reach a UIKit-drawn material.
 *
 * The colours are kept in sync too, so react-navigation's fallbacks (`colors.card`
 * for an unset header background, `colors.text`, `colors.primary` for the tint)
 * land on the app palette rather than stock blue-on-white.
 */
export function NavigationTheme({ children }: { children: React.ReactNode }) {
  const theme = useAppTheme();

  const navigationTheme = useMemo(() => {
    const base = theme.isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: theme.isDark,
      colors: {
        ...base.colors,
        primary: theme.primary,
        background: theme.background,
        card: theme.surface,
        text: theme.onSurface,
        border: theme.border,
        notification: theme.danger,
      },
    };
  }, [theme]);

  return (
    <ReactNavigationThemeProvider value={navigationTheme}>{children}</ReactNavigationThemeProvider>
  );
}
