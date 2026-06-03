import type { LucideIcon } from 'lucide-react-native';
import React, { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type BannerVariant = 'info' | 'warning' | 'danger' | 'success' | 'offline';

type BannerProps = {
  message: string;
  variant?: BannerVariant;
  icon?: LucideIcon;
  action?: ReactNode;
};

export function Banner({ message, variant = 'info', icon: Icon, action }: BannerProps) {
  const theme = useAppTheme();
  const palette = {
    info: { bg: theme.infoSurface, fg: theme.info },
    warning: { bg: theme.warningSurface, fg: theme.warning },
    danger: { bg: theme.dangerSurface, fg: theme.danger },
    success: { bg: theme.successSurface, fg: theme.success },
    offline: { bg: theme.secondary, fg: theme.onSecondary },
  }[variant];

  return (
    <View style={[styles.banner, { backgroundColor: palette.bg }]}>
      {Icon ? <Icon size={18} color={palette.fg} strokeWidth={2} /> : null}
      <Text style={[typography.label, styles.message, { color: palette.fg }]}>{message}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.sm,
    marginHorizontal: space.lg,
    marginBottom: space.sm,
  },
  message: { flex: 1 },
});
