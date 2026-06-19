import { MapPin } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { normalizeToken } from '@/features/minibus/routeSearch';
import { iconSize, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  label: string;
  value: string;
  placeholder?: string;
  stops: string[];
  onChangeText: (text: string) => void;
};

const MAX_SUGGESTIONS = 6;

export function MinibusStopPicker({ label, value, placeholder, stops, onChangeText }: Props) {
  const theme = useAppTheme();
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
    }
  }, []);

  const suggestions = useMemo(() => {
    const query = normalizeToken(value);
    if (!focused || query.length < 2) {
      return [];
    }
    // Hide the list once the value already exactly matches a stop.
    if (stops.some((stop) => normalizeToken(stop) === query)) {
      return [];
    }
    return stops.filter((stop) => normalizeToken(stop).includes(query)).slice(0, MAX_SUGGESTIONS);
  }, [value, stops, focused]);

  return (
    <View style={styles.wrap}>
      <Text style={[typography.label, { color: theme.muted }]}>{label}</Text>
      <View style={[styles.field, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
        <MapPin size={iconSize.md} color={theme.muted} strokeWidth={2} />
        <TextInput
          accessibilityLabel={label}
          placeholder={placeholder}
          placeholderTextColor={theme.muted}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => {
            if (blurTimer.current) {
              clearTimeout(blurTimer.current);
            }
            setFocused(true);
          }}
          onBlur={() => {
            // Delay so a suggestion tap registers before the list unmounts.
            blurTimer.current = setTimeout(() => setFocused(false), 150);
          }}
          style={[styles.input, typography.body, { color: theme.text }]}
          returnKeyType="search"
        />
      </View>

      {suggestions.length > 0 ? (
        <View style={[styles.suggestions, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {suggestions.map((stop) => (
            <Pressable
              key={stop}
              accessibilityRole="button"
              style={styles.suggestion}
              onPress={() => onChangeText(stop)}
            >
              <Text style={[typography.body, { color: theme.text }]}>{stop}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.md,
    gap: space.sm,
    minHeight: 48,
  },
  input: { flex: 1, paddingVertical: space.sm },
  suggestions: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  suggestion: { paddingHorizontal: space.md, paddingVertical: space.sm },
});
