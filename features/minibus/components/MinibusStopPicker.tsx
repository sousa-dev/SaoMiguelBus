import { MapPin } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

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

const LIST_MAX_HEIGHT = 220;

function sortStops(stops: string[]): string[] {
  return [...stops].sort((a, b) => a.localeCompare(b, 'pt'));
}

export function MinibusStopPicker({ label, value, placeholder, stops, onChangeText }: Props) {
  const theme = useAppTheme();

  const options = useMemo(() => {
    const sorted = sortStops(stops);
    const query = normalizeToken(value);
    if (!query) {
      return sorted;
    }
    return sorted.filter((stop) => normalizeToken(stop).includes(query));
  }, [value, stops]);

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
          style={[styles.input, typography.body, { color: theme.text }]}
          returnKeyType="search"
        />
      </View>

      {options.length > 0 ? (
        <ScrollView
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          style={[styles.list, { borderColor: theme.border, maxHeight: LIST_MAX_HEIGHT }]}
          contentContainerStyle={styles.listContent}
        >
          {options.map((stop) => {
            const selected = value === stop;
            return (
              <Pressable
                key={stop}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onChangeText(stop)}
                style={[
                  styles.option,
                  selected && { backgroundColor: theme.surfaceVariant },
                ]}
              >
                <Text
                  style={[
                    typography.body,
                    { color: theme.text },
                    selected && { fontWeight: '600' },
                  ]}
                >
                  {stop}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
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
  list: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  listContent: { paddingVertical: space.xs },
  option: { paddingHorizontal: space.md, paddingVertical: space.sm },
});
