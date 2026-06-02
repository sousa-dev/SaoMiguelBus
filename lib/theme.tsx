import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { staticIslandConfig } from '@/config/island';
import type { BootstrapResponse } from '@/lib/types';

export interface AppTheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  card: string;
  text: string;
  muted: string;
  border: string;
}

const ThemeContext = createContext<AppTheme | null>(null);

export function ThemeProvider({
  bootstrap,
  children,
}: {
  bootstrap?: BootstrapResponse | null;
  children: React.ReactNode;
}) {
  const scheme = useColorScheme();
  const theme = useMemo<AppTheme>(() => {
    const colors = bootstrap?.island?.theme ?? {
      primaryColor: staticIslandConfig.primaryColor,
      secondaryColor: staticIslandConfig.secondaryColor,
      accentColor: staticIslandConfig.accentColor,
    };
    const dark = scheme === 'dark';
    return {
      primary: colors.primaryColor,
      secondary: colors.secondaryColor,
      accent: colors.accentColor,
      background: dark ? '#121212' : '#f5f6f6',
      card: dark ? '#1e1e1e' : '#ffffff',
      text: dark ? '#f5f5f5' : '#1a1a1a',
      muted: dark ? '#9ca3af' : '#6b7280',
      border: dark ? '#333333' : '#e5e7eb',
    };
  }, [bootstrap, scheme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): AppTheme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme must be used within ThemeProvider');
  }
  return ctx;
}
