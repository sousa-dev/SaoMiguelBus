import { ChevronDown, ChevronRight, MapPin, Star, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/IconButton';
import { radius, space, typography } from '@/lib/tokens';
import { useProfileStore } from '@/lib/profile-store';
import {
  MIN_QUERY_LENGTH,
  SEARCH_DEBOUNCE_MS,
  buildFavoriteEntries,
  buildStopEntries,
  foldForSearch,
} from '@/lib/stop-search';
import { useAppTheme } from '@/lib/theme';
import type { Stop } from '@/lib/types';

/** Cosmetic only — the value sent via `onSelect` is always the raw area key. */
function titleCase(raw: string): string {
  return raw
    .toLowerCase()
    .split(' ')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

type Props = {
  placeholder: string;
  value: string;
  stops: Stop[];
  onSelect: (name: string) => void;
  pinColor?: string;
};

export function StopPicker({ placeholder, value, stops, onSelect, pinColor }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [query, setQuery] = useState(value);
  // Filtering runs against this, not `query` directly: on a 816-stop network a
  // one- or two-letter prefix can match hundreds of rows, so the list only
  // recomputes once typing pauses (03 §5b follow-up — nothing should be hidden
  // by a cap, but refiltering on every keystroke is still wasted work).
  const [debouncedQuery, setDebouncedQuery] = useState(value);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  // Collapsed-by-key, not collapsed-by-default: today's list is effectively
  // "always expanded", so a village section starts expanded too — collapsing
  // is something the user does to scan past it faster, not a default state
  // that would hide something nobody asked to hide.
  const [collapsedAreas, setCollapsedAreas] = useState<Set<string>>(() => new Set());
  // Subscribe to the LIST, not to `isFavoriteStop`: the selector for an action
  // returns the same function reference forever, so tapping a star saved the
  // favourite but never re-rendered the row that was supposed to show it.
  const favoriteStops = useProfileStore((s) => s.favoriteStops);
  const toggleFavoriteStop = useProfileStore((s) => s.toggleFavoriteStop);
  const favoriteStopIds = useMemo(
    () => new Set(favoriteStops.map((s) => s.id)),
    [favoriteStops],
  );
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

  // Every stop the query matches, favourites first and alphabetical below them
  // — no rank, no cap. On AzoresBus, same-village stops collapse into one
  // section; on legacy (no groupable names) this is identical to a flat list.
  const entries = useMemo(
    () => buildStopEntries(stops, debouncedQuery, favoriteStopIds),
    [stops, debouncedQuery, favoriteStopIds],
  );

  // Focus with nothing typed (or a query still too short to search) opens on
  // the user's favourites: the whole point of starring a stop is not having to
  // type its name again. Once the query is long enough this gives way to the
  // real results, where the same favourites are floated to the top instead.
  const favoriteEntries = useMemo(
    () => buildFavoriteEntries(stops, favoriteStops),
    [stops, favoriteStops],
  );
  // Keyed on the DEBOUNCED query, not the live one: gating on `query` would
  // drop the favourites the instant the third character lands and leave the
  // panel empty until the debounce fires 300ms later. Following the same clock
  // as `entries` makes it a single swap — favourites, then results.
  const queryTooShort = foldForSearch(debouncedQuery).length < MIN_QUERY_LENGTH;
  const showingFavorites = queryTooShort && favoriteEntries.length > 0;
  const visibleEntries = showingFavorites ? favoriteEntries : entries;

  const toggleAreaCollapsed = (key: string) => {
    setCollapsedAreas((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const selectStop = (name: string) => {
    setQuery(name);
    setDebouncedQuery(name);
    onSelect(name);
    setSuggestionsOpen(false);
  };

  // One renderer for both places a stop row appears — a plain match and a
  // member inside a village section — so a favourite looks identical wherever
  // it turns up. A favourite is marked twice over: a tinted row and a SOLID
  // star. Colour alone carries the state too weakly here, both for a glance
  // down a 60-row list and for anyone who cannot separate the two star colours.
  const renderStopRow = (stop: Pick<Stop, 'id' | 'name'>, indented: boolean) => {
    const favorite = favoriteStopIds.has(stop.id);
    return (
      <View
        key={`stop:${stop.name}`}
        style={[
          styles.suggestionRow,
          indented ? styles.areaMemberRow : null,
          favorite ? { backgroundColor: theme.warningSurface } : null,
        ]}
      >
        <Pressable style={styles.suggestionPress} onPress={() => selectStop(stop.name)}>
          <Text
            style={[
              favorite ? typography.bodyStrong : typography.body,
              { color: theme.text },
            ]}
          >
            {stop.name}
          </Text>
        </Pressable>
        <IconButton
          icon={Star}
          size="sm"
          variant="ghost"
          color={favorite ? theme.warning : theme.muted}
          fill={favorite ? 'currentColor' : undefined}
          accessibilityLabel={favorite ? t('removeFavorites') : t('addToFavorites')}
          onPress={() => toggleFavoriteStop({ id: stop.id, name: stop.name })}
        />
      </View>
    );
  };

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
        {/* Emptying a stop name one backspace at a time is the slowest way to
            change your mind on a 816-stop network. Leaves the list OPEN, so
            clearing lands on favourites and recents rather than on nothing. */}
        {query.length > 0 ? (
          <IconButton
            icon={X}
            variant="ghost"
            size="sm"
            color={theme.muted}
            accessibilityLabel={t('clearInput')}
            onPress={() => {
              setQuery('');
              onSelect('');
              setSuggestionsOpen(true);
            }}
          />
        ) : null}
      </View>
      {suggestionsOpen && visibleEntries.length > 0 ? (
        <View
          style={[
            styles.suggestions,
            { borderColor: theme.border, backgroundColor: theme.card },
          ]}
        >
          {showingFavorites ? (
            <Text
              style={[
                typography.caption,
                styles.favoritesHeader,
                { color: theme.muted, borderBottomColor: theme.border },
              ]}
            >
              {t('transitFavoriteStops')}
            </Text>
          ) : null}
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
            {/*
              Keyed on the NAME, never the id. `serialize_legacy_stops_v2` emits
              each stop under its full name and again under its short name
              REUSING the same id ("Ajuda - Igreja" and "Ajuda" are both id 2) —
              on the deployed legacy network 194 rows carry 108 distinct ids.
              `dedupeStopsByName` keeps both on purpose, because they are two
              searchable names, so the id is not unique here and React drops rows
              that collide on it. The name is unique by construction, since that
              is exactly what the dedupe guarantees.
            */}
            {visibleEntries.map((entry) => {
              if (entry.type === 'stop') {
                return renderStopRow(entry.stop, false);
              }

              // A village section: tapping the LABEL selects the whole area
              // (searches every member — the server does the union, this
              // component only displays the grouping); tapping the CHEVRON
              // only collapses it. Two sibling Pressables, same pattern as the
              // label/star split on a plain row, so no novel gesture handling.
              const collapsed = collapsedAreas.has(entry.key);
              const Chevron = collapsed ? ChevronRight : ChevronDown;
              return (
                <View key={`area:${entry.key}`}>
                  <View style={styles.suggestionRow}>
                    <Pressable
                      style={styles.areaChevron}
                      accessibilityRole="button"
                      accessibilityLabel={collapsed ? 'expand' : 'collapse'}
                      hitSlop={8}
                      onPress={() => toggleAreaCollapsed(entry.key)}
                    >
                      <Chevron size={18} color={theme.muted} />
                    </Pressable>
                    <Pressable
                      style={styles.suggestionPress}
                      onPress={() => selectStop(entry.key)}
                    >
                      <Text style={[typography.bodyStrong, { color: theme.text }]}>
                        {titleCase(entry.key)}
                      </Text>
                    </Pressable>
                  </View>
                  {!collapsed ? entry.members.map((member) => renderStopRow(member, true)) : null}
                </View>
              );
            })}
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
  favoritesHeader: {
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    paddingBottom: space.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    textTransform: 'uppercase',
  },
  suggestionRow: { flexDirection: 'row', alignItems: 'center' },
  suggestionPress: { flex: 1, paddingHorizontal: space.md, paddingVertical: space.sm },
  areaChevron: { paddingLeft: space.md, paddingVertical: space.sm },
  areaMemberRow: { paddingLeft: space.lg },
});
