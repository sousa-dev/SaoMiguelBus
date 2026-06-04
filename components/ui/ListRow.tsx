import { ChevronRight } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import React, { type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { hitSlop, iconSize, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type ListRowProps = {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  /** Replaces `icon` when set (e.g. locale flag emoji). */
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  destructive?: boolean;
  accessibilityLabel?: string;
  /** Bottom hairline divider. Set false for the last row in a grouped card. */
  divider?: boolean;
};

export function ListRow({
  title,
  subtitle,
  icon: Icon,
  leading,
  trailing,
  onPress,
  showChevron = Boolean(onPress),
  destructive,
  accessibilityLabel,
  divider = true,
}: ListRowProps) {
  const theme = useAppTheme();
  const titleColor = destructive ? theme.danger : theme.text;
  const borderBottomWidth = divider ? StyleSheet.hairlineWidth : 0;

  const content = (
    <>
      {leading ? (
        <View style={styles.leadingWrap}>{leading}</View>
      ) : Icon ? (
        <View style={[styles.iconWrap, { backgroundColor: theme.surfaceVariant }]}>
          <Icon size={iconSize.md} color={theme.primary} strokeWidth={2} />
        </View>
      ) : null}
      <View style={styles.textCol}>
        <Text style={[typography.bodyStrong, { color: titleColor }]}>{title}</Text>
        {subtitle ? (
          <Text style={[typography.caption, { color: theme.muted, marginTop: 2 }]}>{subtitle}</Text>
        ) : null}
      </View>
      {trailing}
      {showChevron && onPress ? <ChevronRight size={iconSize.md} color={theme.muted} /> : null}
    </>
  );

  if (!onPress) {
    return (
      <View style={[styles.row, { borderBottomColor: theme.border, borderBottomWidth }]}>{content}</View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      android_ripple={Platform.OS === 'android' ? { color: theme.outline } : undefined}
      style={({ pressed }) => [
        styles.row,
        {
          borderBottomColor: theme.border,
          borderBottomWidth,
          opacity: pressed ? 0.85 : 1,
          minHeight: hitSlop.minTouch,
        },
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    gap: space.md,
  },
  leadingWrap: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1 },
});
