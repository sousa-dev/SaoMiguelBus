import { MapPin, Star } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { IconButton } from '@/components/ui/IconButton';
import { radius, space, typography } from '@/lib/tokens';
import { useProfileStore } from '@/lib/profile-store';
import { SEARCH_DEBOUNCE_MS, filterStops } from '@/lib/stop-search';
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
  // Filtering runs against this, not `query` directly: on a 816-stop network a
  // one- or two-letter prefix can match hundreds of rows, so the list only
  // recomputes once typing pauses (03 §5b follow-up — nothing should be hidden
  // by a cap, but refiltering on every keystroke is still wasted work).
  const [debouncedQuery, setDebouncedQuery] = useState(value);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const isFavoriteStop = useProfileStore((s) => s.isFavoriteStop);
  const toggleFavoriteStop = useProfileStore((s) => s.toggleFavoriteStop);
  const iconColor = pinColor ?? theme.muted;

  useEffect(() => {
    if (value === query) return;
    setQuery(value);
    setDebouncedQuery(value);
    setSuggestionsOpen(false);
  }, [value, query]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // Every stop the query matches, alphabetically — no rank, no cap.
  const filtered = useMemo(() => filterStops(stops, debouncedQuery), [stops, debouncedQuery]);

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
          {/*
            A plain View with maxHeight + overflow:hidden CLIPS rather than
            scrolls — with no cap upstream, a query matching e.g. 66 stops would
            render all of them but only the first few were ever reachable. This
            sits inside the screen's own ScrollView, so nestedScrollEnabled and
            keyboardShouldPersistTaps matter: without them, Android can route the
            gesture to the outer scroll, and a tap can dismiss the keyboard
            before the row registers the press.
          */}
          <ScrollView
            style={styles.suggestionsScroll}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {filtered.map((item, index) => (
              <View key={`${item.id}-${index}`} style={styles.suggestionRow}>
                <Pressable
                  style={styles.suggestionPress}
                  onPress={() => {
                    setQuery(item.name);
                    setDebouncedQuery(item.name);
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
          </ScrollView>
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
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    overflow: 'hidden', // clips the ScrollView's corners; the scroll bound is below
    zIndex: 10,
  },
  suggestionsScroll: {
    // A real scroll bound, not a clip: every match is reachable, however many
    // there are.
    maxHeight: 280,
  },
  suggestionRow: { flexDirection: 'row', alignItems: 'center' },
  suggestionPress: { flex: 1, paddingHorizontal: space.md, paddingVertical: space.sm },
});
