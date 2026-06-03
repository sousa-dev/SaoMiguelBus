import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { hitSlop, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  fullWidth,
  onPress,
  style,
  ...rest
}: ButtonProps) {
  const theme = useAppTheme();
  const isDisabled = disabled || loading;

  const colors = (() => {
    switch (variant) {
      case 'secondary':
        return { bg: theme.secondary, fg: theme.onSecondary, border: theme.secondary };
      case 'outline':
        return { bg: 'transparent', fg: theme.primary, border: theme.primary };
      case 'danger':
        return { bg: theme.danger, fg: theme.onDanger, border: theme.danger };
      case 'ghost':
        return { bg: 'transparent', fg: theme.primary, border: 'transparent' };
      default:
        return { bg: theme.primary, fg: theme.onPrimary, border: theme.primary };
    }
  })();

  const paddingV = size === 'sm' ? space.sm : size === 'lg' ? space.lg : space.md;
  const paddingH = size === 'sm' ? space.lg : size === 'lg' ? space['2xl'] : space.xl;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={(e) => {
        if (Platform.OS !== 'web' && !isDisabled) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress?.(e);
      }}
      android_ripple={
        Platform.OS === 'android' ? { color: theme.outline, borderless: false } : undefined
      }
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          paddingVertical: paddingV,
          paddingHorizontal: paddingH,
          minHeight: hitSlop.minTouch,
          opacity: isDisabled ? 0.5 : pressed ? 0.9 : 1,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={colors.fg} />
      ) : (
        <Text style={[styles.label, typography.label, { color: colors.fg }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { textAlign: 'center' },
});
