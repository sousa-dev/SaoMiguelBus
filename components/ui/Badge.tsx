import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type BadgeProps = {
  label: string;
  tone?: 'neutral' | 'primary' | 'accent' | 'danger';
};

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const theme = useAppTheme();
  const colors = {
    neutral: { bg: theme.surfaceVariant, fg: theme.text },
    primary: { bg: theme.primary, fg: theme.onPrimary },
    accent: { bg: theme.accent, fg: theme.onAccent },
    danger: { bg: theme.dangerSurface, fg: theme.danger },
  }[tone];

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[typography.caption, { color: colors.fg, fontWeight: '700' }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
});
