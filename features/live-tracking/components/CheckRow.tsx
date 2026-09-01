import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { hitSlop, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  label: string;
  checked: boolean;
  onToggle: () => void;
  /** Secondary line, e.g. a route's full name under its code. */
  subtitle?: string;
  /** A line colour swatch, when the row represents something with one. */
  accentColor?: string;
  accessibilityLabel?: string;
};

/**
 * A checkbox row.
 *
 * The app had no checkbox at all before this — `ListRow` hard-codes
 * `accessibilityRole="button"` with no checked state, and the only checkbox
 * markup lived inside minibus's stops toggle. Screen-reader users need the
 * control to announce itself as checkable and to say which way it is set, so
 * that is the part worth getting right here rather than reusing a row that
 * announces itself as a button.
 */
export function CheckRow({
  label,
  checked,
  onToggle,
  subtitle,
  accentColor,
  accessibilityLabel,
}: Props) {
  const theme = useAppTheme();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={hitSlop.minTouch}
      onPress={onToggle}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}
    >
      <View
        style={[
          styles.box,
          {
            borderColor: checked ? theme.primary : theme.outline,
            backgroundColor: checked ? theme.primary : theme.surface,
          },
        ]}
      >
        {checked ? <Check size={14} color={theme.onPrimary} strokeWidth={3} /> : null}
      </View>

      {accentColor ? (
        <View style={[styles.swatch, { backgroundColor: accentColor }]} />
      ) : null}

      <View style={styles.body}>
        <Text style={[typography.body, { color: theme.text }]} numberOfLines={1}>
          {label}
        </Text>
        {subtitle ? (
          <Text style={[typography.caption, { color: theme.muted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    minHeight: 48,
  },
  box: {
    width: 20,
    height: 20,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: { width: 4, height: 24, borderRadius: 2 },
  body: { flex: 1, minWidth: 0, gap: 2 },
});
