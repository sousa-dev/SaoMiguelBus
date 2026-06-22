import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type BadgeProps = {
  label: string;
  tone?: 'neutral' | 'primary' | 'accent' | 'danger';
  size?: 'default' | 'compact';
};

export function Badge({ label, tone = 'neutral', size = 'default' }: BadgeProps) {
  const theme = useAppTheme();
  const isCompact = size === 'compact';
  const colors = {
    neutral: { bg: theme.surfaceVariant, fg: theme.text },
    primary: { bg: theme.primary, fg: theme.onPrimary },
    accent: { bg: theme.accent, fg: theme.onAccent },
    danger: { bg: theme.dangerSurface, fg: theme.danger },
  }[tone];

  return (
    <View
      style={[
        styles.badge,
        isCompact && styles.badgeCompact,
        { backgroundColor: colors.bg },
      ]}
    >
      <Text
        style={[
          isCompact ? styles.compactText : typography.caption,
          { color: colors.fg, fontWeight: '700' },
        ]}
      >
        {label}
      </Text>
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
  badgeCompact: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  compactText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
  },
});
