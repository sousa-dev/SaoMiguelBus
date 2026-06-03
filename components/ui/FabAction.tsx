import type { LucideIcon } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { elevation, hitSlop, iconSize, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type FabActionProps = {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
};

const MINI = Platform.select({ ios: 48, android: 48, default: 48 }) as number;

/** One expanded speed-dial row: a label pill to the left of a mini circular button. */
export function FabAction({ icon: Icon, label, onPress }: FabActionProps) {
  const theme = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();

  const pillMaxWidth = useMemo(
    () => windowWidth - space.xl * 2 - MINI - space.md - space.lg,
    [windowWidth],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.row}
      hitSlop={8}
    >
      <View
        style={[
          styles.pill,
          elevation(2, theme.text),
          { backgroundColor: theme.card, maxWidth: pillMaxWidth },
        ]}
      >
        <Text style={[typography.label, styles.label, { color: theme.text }]}>{label}</Text>
      </View>
      <View
        style={[styles.miniFab, elevation(2, theme.text), { backgroundColor: theme.surface }]}
        pointerEvents="none"
      >
        <Icon size={iconSize.md} color={theme.primary} strokeWidth={2.5} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: space.md,
    marginBottom: space.md,
    minHeight: hitSlop.minTouch,
    maxWidth: '100%',
  },
  pill: {
    flexShrink: 1,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
  },
  label: {
    flexShrink: 1,
    textAlign: 'right',
  },
  miniFab: {
    width: MINI,
    height: MINI,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
