import React, { type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { elevation, radius, space } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type CardProps = {
  children: ReactNode;
  onPress?: () => void;
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function Card({ children, onPress, elevated = true, style, accessibilityLabel }: CardProps) {
  const theme = useAppTheme();
  const flat = StyleSheet.flatten(style);
  const pressableLayout =
    flat?.flex != null
      ? { flex: flat.flex as number, alignSelf: 'stretch' as const, minWidth: 0 }
      : null;

  const content = (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
        elevated ? elevation(1, theme.text) : null,
        style,
      ]}
    >
      {children}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      android_ripple={Platform.OS === 'android' ? { color: theme.outline } : undefined}
      style={({ pressed }) => [pressableLayout, { opacity: pressed ? 0.92 : 1 }]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.lg,
  },
});
