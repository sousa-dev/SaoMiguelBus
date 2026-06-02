import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAppTheme } from '@/lib/theme';
import type { Stop } from '@/lib/types';

type Props = {
  label: string;
  placeholder: string;
  value: string;
  stops: Stop[];
  onSelect: (name: string) => void;
};

export function StopPicker({ label, placeholder, value, stops, onSelect }: Props) {
  const theme = useAppTheme();
  const [query, setQuery] = useState(value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return stops.slice(0, 40);
    }
    return stops.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 40);
  }, [query, stops]);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          { borderColor: theme.border, color: theme.text, backgroundColor: theme.card },
        ]}
        placeholder={placeholder}
        placeholderTextColor={theme.muted}
        value={query}
        onChangeText={(text) => {
          setQuery(text);
          onSelect(text);
        }}
      />
      {query.length > 0 && filtered.length > 0 ? (
        <View style={[styles.suggestions, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <FlatList
            keyboardShouldPersistTaps="handled"
            data={filtered}
            keyExtractor={(item) => `${item.id}-${item.name}`}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setQuery(item.name);
                  onSelect(item.name);
                }}
                style={styles.suggestionRow}
              >
                <Text style={{ color: theme.text }}>{item.name}</Text>
              </Pressable>
            )}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  suggestions: {
    marginTop: 4,
    maxHeight: 160,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  suggestionRow: { paddingHorizontal: 12, paddingVertical: 10 },
});
