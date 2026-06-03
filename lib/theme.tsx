import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { Appearance, useColorScheme } from 'react-native';

import { staticIslandConfig } from '@/config/island';
import { onColorFor, withAlpha } from '@/lib/color-utils';
import { resolveColorScheme, useThemePrefsStore } from '@/lib/theme-prefs';
import type { BootstrapResponse } from '@/lib/types';

export interface AppTheme {
  primary: string;
  onPrimary: string;
  secondary: string;
  onSecondary: string;
  accent: string;
  onAccent: string;
  background: string;
  surface: string;
  surfaceVariant: string;
  surfaceElevated: string;
  surfaceSunken: string;
  card: string;
  text: string;
  onSurface: string;
  onSurfaceMuted: string;
  muted: string;
  border: string;
  divider: string;
  outline: string;
  scrim: string;
  success: string;
  onSuccess: string;
  successSurface: string;
  warning: string;
  onWarning: string;
  warningSurface: string;
  danger: string;
  onDanger: string;
  dangerSurface: string;
  info: string;
  onInfo: string;
  infoSurface: string;
  /** @deprecated use onPrimary */
  headerTint: string;
  isDark: boolean;
}

const ThemeContext = createContext<AppTheme | null>(null);

function buildSemanticPalette(dark: boolean) {
  if (dark) {
    return {
      background: '#121212',
      surface: '#1e1e1e',
      surfaceVariant: '#2a2a2a',
      card: '#1e1e1e',
      text: '#f5f5f5',
      muted: '#9ca3af',
      border: '#333333',
      outline: '#404040',
      scrim: 'rgba(0,0,0,0.6)',
      success: '#4ade80',
      onSuccess: '#052e16',
      successSurface: '#14532d',
      warning: '#fbbf24',
      onWarning: '#422006',
      warningSurface: '#713f12',
      danger: '#f87171',
      onDanger: '#450a0a',
      dangerSurface: '#7f1d1d',
      info: '#60a5fa',
      onInfo: '#172554',
      infoSurface: '#1e3a8a',
    };
  }
  return {
    background: '#f5f6f6',
    surface: '#ffffff',
    surfaceVariant: '#f0f1f2',
    card: '#ffffff',
    text: '#1a1a1a',
    muted: '#6b7280',
    border: '#e5e7eb',
    outline: '#d1d5db',
    scrim: 'rgba(0,0,0,0.45)',
    success: '#15803d',
    onSuccess: '#ffffff',
    successSurface: '#dcfce7',
    warning: '#b45309',
    onWarning: '#ffffff',
    warningSurface: '#fef3c7',
    danger: '#b91c1c',
    onDanger: '#ffffff',
    dangerSurface: '#fee2e2',
    info: '#1d4ed8',
    onInfo: '#ffffff',
    infoSurface: '#dbeafe',
  };
}

export function ThemeProvider({
  bootstrap,
  children,
}: {
  bootstrap?: BootstrapResponse | null;
  children: React.ReactNode;
}) {
  const systemScheme = useColorScheme();
  const preference = useThemePrefsStore((s) => s.preference);
  const scheme = resolveColorScheme(preference, systemScheme);
  const dark = scheme === 'dark';

  useEffect(() => {
    Appearance.setColorScheme(preference === 'system' ? null : preference);
  }, [preference]);

  const theme = useMemo<AppTheme>(() => {
    const colors = bootstrap?.island?.theme ?? {
      primaryColor: staticIslandConfig.primaryColor,
      secondaryColor: staticIslandConfig.secondaryColor,
      accentColor: staticIslandConfig.accentColor,
    };
    const palette = buildSemanticPalette(dark);
    const primary = colors.primaryColor;
    const secondary = colors.secondaryColor;
    const accent = colors.accentColor;
    const onPrimary = onColorFor(primary);
    const onSecondary = onColorFor(secondary);
    const onAccent = onColorFor(accent);

    return {
      primary,
      onPrimary,
      secondary,
      onSecondary,
      accent,
      onAccent,
      background: palette.background,
      surface: palette.surface,
      surfaceVariant: palette.surfaceVariant,
      surfaceElevated: palette.card,
      surfaceSunken: palette.surfaceVariant,
      card: palette.card,
      text: palette.text,
      onSurface: palette.text,
      onSurfaceMuted: palette.muted,
      muted: palette.muted,
      border: palette.border,
      divider: palette.border,
      outline: palette.outline,
      scrim: palette.scrim,
      success: palette.success,
      onSuccess: palette.onSuccess,
      successSurface: palette.successSurface,
      warning: palette.warning,
      onWarning: palette.onWarning,
      warningSurface: palette.warningSurface,
      danger: palette.danger,
      onDanger: palette.onDanger,
      dangerSurface: palette.dangerSurface,
      info: palette.info,
      onInfo: palette.onInfo,
      infoSurface: palette.infoSurface,
      headerTint: onPrimary,
      isDark: dark,
    };
  }, [bootstrap, dark]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): AppTheme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme must be used within ThemeProvider');
  }
  return ctx;
}

/** Muted primary tint for chips / selected rows. */
export function primaryTint(theme: AppTheme, alpha = 0.12): string {
  return withAlpha(theme.primary, alpha);
}
