import React from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';

import { onColorFor, withAlpha } from '@/lib/color-utils';
import { hitSlop, radius, space, typography } from '@/lib/tokens';
import { primaryTint, useAppTheme } from '@/lib/theme';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  accentColor?: string;
};

export function Chip({
  label,
  selected,
  onPress,
  disabled,
  accessibilityLabel,
  accentColor,
}: ChipProps) {
  const theme = useAppTheme();
  const accent = accentColor?.trim();
  const hasAccent = Boolean(accent);

  const bg = selected ? theme.primary : theme.surfaceVariant;
  const fg = selected ? theme.onPrimary : theme.text;
  const backgroundColor = hasAccent
    ? selected
      ? accent!
      : withAlpha(accent!, theme.isDark ? 0.28 : 0.14)
    : selected
      ? bg
      : primaryTint(theme, theme.isDark ? 0.2 : 0.08);
  const borderColor = hasAccent ? accent! : selected ? theme.primary : theme.border;
  const textColor = hasAccent ? (selected ? onColorFor(accent!) : theme.text) : fg;

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
          backgroundColor,
          borderColor,
          minHeight: hitSlop.minTouch - 8,
          opacity: disabled ? 0.5 : pressed ? 0.9 : 1,
        },
      ]}
    >
      <Text style={[typography.label, { color: textColor, fontSize: 13 }]}>{label}</Text>
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
