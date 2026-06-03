import { ChevronDown, ChevronRight } from 'lucide-react-native';
import React, { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { elevation, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  icon: ReactNode;
  iconBackground: string;
  title: string;
  subtitle: string;
  countLabel: string;
  countBackground: string;
  countColor: string;
  children: ReactNode;
  defaultOpen?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function TransitCollapsibleSection({
  icon,
  iconBackground,
  title,
  subtitle,
  countLabel,
  countBackground,
  countColor,
  children,
  defaultOpen = true,
  style,
}: Props) {
  const theme = useAppTheme();
  const [open, setOpen] = useState(defaultOpen);
  const Chevron = open ? ChevronDown : ChevronRight;

  const toggle = () => setOpen((v) => !v);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
        elevation(1, theme.text),
        style,
      ]}
    >
      <Pressable
        onPress={toggle}
        style={styles.header}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
      >
        <View style={[styles.iconCircle, { backgroundColor: iconBackground }]}>{icon}</View>
        <View style={styles.headerText}>
          <Text style={[typography.headline, { color: theme.text }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[typography.caption, { color: theme.muted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <View style={[styles.countBadge, { backgroundColor: countBackground }]}>
          <Text style={[typography.caption, { color: countColor, fontWeight: '700' }]}>{countLabel}</Text>
        </View>
        <View style={[styles.chevronBtn, { backgroundColor: theme.surfaceVariant }]}>
          <Chevron size={16} color={theme.muted} />
        </View>
      </Pressable>

      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: space.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  countBadge: {
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  chevronBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, minWidth: 0 },
  body: { gap: space.sm, marginTop: space.md },
});
