import { MapPin, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/IconButton';
import { MINIBUS_ACCENT } from '@/features/minibus/lib/moduleAccent';
import {
  MIN_QUERY_LENGTH,
  SEARCH_DEBOUNCE_MS,
  foldForSearch,
} from '@/lib/stop-search';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  label?: string;
  value: string;
  placeholder?: string;
  stops: string[];
  onChangeText: (text: string) => void;
};

/** A suggestion row's height: body line height (22) plus its two sm paddings (8+8). */
const SUGGESTION_ROW_HEIGHT = 38;

/** The focus panel never shows more than this many stops, however tall the device. */
const MAX_FOCUS_STOPS = 5;

/** Share of the device height the focus panel may occupy. */
const FOCUS_PANEL_HEIGHT_RATIO = 0.25;

/** Scroll bound for real search results (matches the transit picker). */
const RESULTS_MAX_HEIGHT = 280;

/**
 * Origin/destination field, mirroring the transit tab's `StopPicker`
 * behaviour: the suggestion list is CLOSED until the field is focused, closes
 * again when it loses focus, and nothing matches below `MIN_QUERY_LENGTH`.
 * Instead of the transit picker's favourites panel, focusing an empty field expands to the first few stops of
 * the network — up to `MAX_FOCUS_STOPS`, fewer on short devices where that
 * many rows would crowd the planner. Once the query is long enough, the full
 * matched list takes over (every match, no cap, 280pt scroll bound). The
 * dropdown chrome and row layout are lifted from the transit picker too, so
 * the two planners read as one control. MiniBus stops carry no ids or
 * villages, so there are no favourites or area sections — a flat alphabetical
 * list.
 */
export function MinibusStopPicker({ label, value, placeholder, stops, onChangeText }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const inputRef = useRef<TextInput>(null);
  const { height: windowHeight } = useWindowDimensions();

  const [query, setQuery] = useState(value);
  // Filtering runs against this, not `query` directly: refiltering on every
  // keystroke is wasted work while the rider is still typing (same rule as
  // the transit picker).
  const [debouncedQuery, setDebouncedQuery] = useState(value);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  // How many stops the focus panel expands to: five rows on a tall device,
  // fewer on a short one.
  const focusStopCount = useMemo(
    () =>
      Math.max(
        1,
        Math.min(
          MAX_FOCUS_STOPS,
          Math.floor((windowHeight * FOCUS_PANEL_HEIGHT_RATIO) / SUGGESTION_ROW_HEIGHT),
        ),
      ),
    [windowHeight],
  );

  // Keeps the field in step with outside rewrites of the value (the planner's
  // swap button) and closes the list after one lands.
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

  const sortedStops = useMemo(
    () => [...stops].sort((a, b) => a.localeCompare(b, 'pt')),
    [stops],
  );

  const queryTooShort = foldForSearch(debouncedQuery).length < MIN_QUERY_LENGTH;

  const options = useMemo(() => {
    if (queryTooShort) {
      // Focused with nothing useful typed: the first few stops of the network,
      // not a dump of all of it — the cap is device-height-derived.
      return sortedStops.slice(0, focusStopCount);
    }
    const q = foldForSearch(debouncedQuery);
    return sortedStops.filter((stop) => foldForSearch(stop).includes(q));
  }, [sortedStops, debouncedQuery, queryTooShort, focusStopCount]);

  const selectStop = (stop: string) => {
    setQuery(stop);
    setDebouncedQuery(stop);
    onChangeText(stop);
    setSuggestionsOpen(false);
    inputRef.current?.blur();
    Keyboard.dismiss();
  };

  return (
    <View style={styles.wrap}>
      {label ? <Text style={[typography.label, { color: theme.muted }]}>{label}</Text> : null}
      <View style={[styles.field, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
        <MapPin size={20} color={MINIBUS_ACCENT} style={styles.pin} />
        <TextInput
          ref={inputRef}
          accessibilityLabel={label}
          placeholder={placeholder}
          placeholderTextColor={theme.muted}
          value={query}
          autoCorrect={false}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="none"
          onFocus={() => setSuggestionsOpen(true)}
          onBlur={() => setSuggestionsOpen(false)}
          onChangeText={(text) => {
            setQuery(text);
            onChangeText(text);
            setSuggestionsOpen(true);
          }}
          style={[styles.input, typography.body, { color: theme.text }]}
        />
        {/* Emptying a stop name one backspace at a time is the slowest way to
            change your mind — the clear button leaves the list open, matching
            the transit picker. */}
        {query.length > 0 ? (
          <IconButton
            icon={X}
            variant="ghost"
            size="sm"
            color={theme.muted}
            accessibilityLabel={t('clearInput')}
            onPress={() => {
              setQuery('');
              onChangeText('');
              setSuggestionsOpen(true);
            }}
          />
        ) : null}
      </View>

      {suggestionsOpen && options.length > 0 ? (
        <View
          style={[
            styles.suggestions,
            { borderColor: theme.border, backgroundColor: theme.card },
          ]}
        >
          {/* A ScrollView with a maxHeight bound, not a clip. The focus panel
              bounds to exactly its stop count so no half row peeks in; real
              results keep the transit picker's 280pt bound. Sits inside the
              screen's own ScrollView, so nestedScrollEnabled and
              keyboardShouldPersistTaps matter on Android. */}
          <ScrollView
            style={[
              styles.suggestionsScroll,
              { maxHeight: queryTooShort ? focusStopCount * SUGGESTION_ROW_HEIGHT : RESULTS_MAX_HEIGHT },
            ]}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {options.map((stop) => (
              <Pressable
                key={stop}
                accessibilityRole="button"
                onPress={() => selectStop(stop)}
                style={styles.suggestionPress}
              >
                <Text style={[typography.body, { color: theme.text }]}>{stop}</Text>
              </Pressable>
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
    // there are. The default here is overridden per mode in render.
    maxHeight: RESULTS_MAX_HEIGHT,
  },
  suggestionPress: { paddingHorizontal: space.md, paddingVertical: space.sm },
});
