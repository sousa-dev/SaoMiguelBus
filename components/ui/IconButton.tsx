import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Platform, Pressable, type PressableProps, StyleSheet, View } from 'react-native';

import { hitSlop, iconSize, radius, space } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type IconButtonProps = Omit<PressableProps, 'children'> & {
  icon: LucideIcon;
  size?: keyof typeof iconSize;
  variant?: 'filled' | 'tonal' | 'ghost';
  color?: string;
  /**
   * Paints the glyph's interior — for icons that carry an on/off meaning in
   * their fill (a starred stop, a saved item), where a stroke-colour change
   * alone reads as a theme accent rather than as state. Pass `'currentColor'`
   * to fill with the icon's own colour.
   */
  fill?: string;
  accessibilityLabel: string;
};

export function IconButton({
  icon: Icon,
  size = 'md',
  variant = 'ghost',
  color,
  fill,
  accessibilityLabel,
  disabled,
  onPress,
  style,
  ...rest
}: IconButtonProps) {
  const theme = useAppTheme();
  const dim = iconSize[size];

  const bg =
    variant === 'filled'
      ? theme.primary
      : variant === 'tonal'
        ? theme.surfaceVariant
        : 'transparent';
  const iconColor = variant === 'filled' ? theme.onPrimary : (color ?? theme.text);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={(e) => {
        if (Platform.OS !== 'web') {
          void Haptics.selectionAsync();
        }
        onPress?.(e);
      }}
      android_ripple={
        Platform.OS === 'android' && variant !== 'ghost'
          ? { color: theme.outline, borderless: true }
          : undefined
      }
      style={(state) => [
        styles.base,
        {
          minWidth: hitSlop.minTouch,
          minHeight: hitSlop.minTouch,
          backgroundColor: bg,
          opacity: disabled ? 0.4 : state.pressed ? 0.85 : 1,
        },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      <View
        pointerEvents="none"
        style={{ width: dim, height: dim, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon
          size={dim}
          color={iconColor}
          strokeWidth={2}
          fill={fill === 'currentColor' ? iconColor : (fill ?? 'none')}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    padding: space.sm,
  },
});
