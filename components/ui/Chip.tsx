import React from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';

import { hitSlop, radius, space, typography } from '@/lib/tokens';
import { primaryTint, useAppTheme } from '@/lib/theme';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export function Chip({ label, selected, onPress, disabled, accessibilityLabel }: ChipProps) {
  const theme = useAppTheme();
  const bg = selected ? theme.primary : theme.surfaceVariant;
  const fg = selected ? theme.onPrimary : theme.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled || !onPress}
      onPress={onPress}
      android_ripple={Platform.OS === 'android' ? { color: theme.outline } : undefined}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? bg : primaryTint(theme, theme.isDark ? 0.2 : 0.08),
          borderColor: selected ? theme.primary : theme.border,
          minHeight: hitSlop.minTouch - 8,
          opacity: disabled ? 0.5 : pressed ? 0.9 : 1,
        },
      ]}
    >
      <Text style={[typography.label, { color: fg, fontSize: 13 }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    marginRight: space.sm,
    marginBottom: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
