import { ChevronDown, ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type AreaProps = {
  label: string;
  count: number;
  collapsed: boolean;
  height: number;
  onToggle: () => void;
  /** Given when tapping the label should select the whole village. */
  onSelect?: () => void;
};

/**
 * A village header, e.g. "Capelas · 6".
 *
 * The chevron and the label are separate targets, matching the planner's
 * picker: collapsing a section and choosing the whole village are different
 * intents, and a single tap target would have to guess which one was meant.
 * Where a screen has no notion of "the whole village" the label simply
 * collapses too, rather than presenting a control that does nothing.
 */
export function StopAreaRow({
  label,
  count,
  collapsed,
  height,
  onToggle,
  onSelect,
}: AreaProps) {
  const theme = useAppTheme();
  const Chevron = collapsed ? ChevronRight : ChevronDown;

  return (
    <View style={[styles.areaRow, { height, backgroundColor: theme.surfaceVariant }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: !collapsed }}
        accessibilityLabel={label}
        hitSlop={8}
        onPress={onToggle}
        style={styles.chevron}
      >
        <Chevron size={18} color={theme.muted} />
      </Pressable>
      <Pressable style={styles.areaLabel} onPress={onSelect ?? onToggle}>
        <Text style={[typography.label, { color: theme.text }]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
      <Text style={[typography.caption, { color: theme.muted }]}>{count}</Text>
    </View>
  );
}

type StopRowProps = {
  name: string;
  indented: boolean;
  height: number;
  onPress: () => void;
  selected?: boolean;
};

export function StopRow({ name, indented, height, onPress, selected }: StopRowProps) {
  const theme = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.stopRow,
        { height },
        indented ? styles.indented : null,
        selected ? { backgroundColor: theme.surfaceVariant } : null,
      ]}
    >
      <Text
        style={[
          selected ? typography.bodyStrong : typography.body,
          { color: theme.text },
        ]}
        numberOfLines={1}
      >
        {name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  areaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.sm,
  },
  chevron: { padding: space.xs },
  areaLabel: { flex: 1, minWidth: 0 },
  stopRow: {
    justifyContent: 'center',
    paddingHorizontal: space.md,
  },
  /** Members sit under their header, so the grouping survives a fast scroll. */
  indented: { paddingLeft: space['2xl'] },
});
