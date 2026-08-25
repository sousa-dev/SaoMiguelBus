import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { elevation, hitSlop, iconSize, radius } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type FabProps = {
  icon: LucideIcon;
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
};

export function Fab({ icon: Icon, onPress, accessibilityLabel, disabled }: FabProps) {
  const theme = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      android_ripple={Platform.OS === 'android' ? { color: theme.onPrimary } : undefined}
      style={({ pressed }) => [
        styles.fab,
        elevation(3, theme.text),
        {
          backgroundColor: theme.primary,
          opacity: disabled ? 0.5 : pressed ? 0.92 : 1,
          minWidth: hitSlop.minTouch,
          minHeight: hitSlop.minTouch,
        },
      ]}
    >
      <View pointerEvents="none">
        <Icon size={iconSize.lg} color={theme.onPrimary} strokeWidth={2.5} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
});
