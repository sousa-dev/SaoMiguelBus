import { MapPin, Star } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { IconButton } from '@/components/ui/IconButton';
import { radius, space, typography } from '@/lib/tokens';
import { useProfileStore } from '@/lib/profile-store';
import { rankStopSuggestions } from '@/lib/stop-search';
import { useAppTheme } from '@/lib/theme';
import type { Stop } from '@/lib/types';

type Props = {
  placeholder: string;
  value: string;
  stops: Stop[];
  onSelect: (name: string) => void;
  pinColor?: string;
};

export function StopPicker({ placeholder, value, stops, onSelect, pinColor }: Props) {
  const theme = useAppTheme();
  const [query, setQuery] = useState(value);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const favoriteStops = useProfileStore((s) => s.favoriteStops);
  const isFavoriteStop = useProfileStore((s) => s.isFavoriteStop);
  const toggleFavoriteStop = useProfileStore((s) => s.toggleFavoriteStop);
  const iconColor = pinColor ?? theme.muted;

  useEffect(() => {
    if (value === query) return;
    setQuery(value);
    setSuggestionsOpen(false);
  }, [value, query]);

  const filtered = useMemo(
    () =>
      rankStopSuggestions(stops, query, {
        favoriteIds: new Set(favoriteStops.map((s) => s.id)),
      }),
    [query, stops, favoriteStops],
  );

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.field,
          {
            borderColor: theme.border,
            backgroundColor: theme.surfaceVariant,
          },
        ]}
      >
        <MapPin size={20} color={iconColor} style={styles.pin} />
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder={placeholder}
          placeholderTextColor={theme.muted}
          value={query}
          autoCorrect={false}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="none"
          onFocus={() => setSuggestionsOpen(true)}
          onChangeText={(text) => {
            setQuery(text);
            onSelect(text);
            setSuggestionsOpen(true);
          }}
        />
      </View>
      {suggestionsOpen && query.length > 0 && filtered.length > 0 ? (
        <View
          style={[
            styles.suggestions,
            { borderColor: theme.border, backgroundColor: theme.card },
          ]}
        >
          {filtered.map((item, index) => (
            <View key={`${item.id}-${index}`} style={styles.suggestionRow}>
              <Pressable
                style={styles.suggestionPress}
                onPress={() => {
                  setQuery(item.name);
                  onSelect(item.name);
                  setSuggestionsOpen(false);
                }}
              >
                <Text style={[typography.body, { color: theme.text }]}>{item.name}</Text>
              </Pressable>
              <IconButton
                icon={Star}
                size="sm"
                variant="ghost"
                color={isFavoriteStop(item.id) ? theme.warning : theme.muted}
                accessibilityLabel="favorite stop"
                onPress={() => toggleFavoriteStop({ id: item.id, name: item.name })}
              />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.xs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.full,
    paddingRight: space.md,
  },
  pin: { marginLeft: space.md },
  input: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: space.sm,
    fontSize: 16,
  },
  suggestions: {
    marginTop: 4,
    maxHeight: 140,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    overflow: 'hidden',
    zIndex: 10,
  },
  suggestionRow: { flexDirection: 'row', alignItems: 'center' },
  suggestionPress: { flex: 1, paddingHorizontal: space.md, paddingVertical: space.sm },
});
