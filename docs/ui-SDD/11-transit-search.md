# UI-SDD 11 — Transit Search

**Screen & route:** [`app/(tabs)/transit/index.tsx`](../../app/(tabs)/transit/index.tsx) (+ [`_layout.tsx`](../../app/(tabs)/transit/_layout.tsx)) → `/(tabs)/transit`. Components: `StopPicker`, `FavoritesPanel`, `FavoriteToggle`, `RouteResults`, `TripDetail`, `OfflineBanner`.

---

## 1. Purpose
The core task: pick origin + destination, day, time → see bus routes; or open Google-style directions. Favorites for quick re-search. This is the primary, highest-traffic screen.

## 2. Current state
`ScrollView` with island name title, subtitle, `FavoritesPanel`, two `StopPicker`s, `FavoriteToggle`, day chips (weekday/sat/sun), a raw `TextInput` for time ("08:00"), a green Search button + secondary Directions button, then inline results + selected `TripDetail`. Offline disables search and shows `OfflineBanner`. Solid logic; visually generic — raw inputs, hand-rolled buttons/chips, time as free text.

## 3. Rebrand direction
- **Search as a card.** Group origin/destination/day/time into one elevated `Card` "trip planner". Inputs use `StopPicker` restyled as `Field` rows with a leading `MapPin`; add an `ArrowRightLeft` **swap** button between origin/destination (common, expected, currently missing).
- **Day selector → `Chip` row** (or `SegmentedControl` for the 3 fixed options) using tokens; selected = `primary`.
- **Time → native time picker.** Replace free-text `TextInput` with a tap-to-open native time picker (`@react-native-community/datetimepicker`, to add): iOS wheel/inline, Android clock dialog. Show selected time in a `Field` with a `Clock` icon. Removes locale/format errors from manual `HHhMM` munging.
- **Actions → `Button`s.** Primary `Button` "Search" (leading `Search`); secondary/outline `Button` "Directions" (leading `Footprints`). Disabled/offline states from `Button` (no manual muted bg). Sticky action area optional.
- **Favorites** as horizontal `Chip`/`Card` carousel with `Star`; `FavoriteToggle` becomes a star `IconButton` inline with the planner.
- **Results** (`RouteResults`) as `Card` list; selecting expands `TripDetail` inline or pushes detail ([`13-transit-trip-detail.md`](./13-transit-trip-detail.md)). Replace `👍/👎` in `RouteResults` with `ThumbsUp`/`ThumbsDown` + count, semantic colors.
- **Island hero** stays (island name `display`), but tighten spacing to the scale.

## 4. iOS specifics
- Large title (island name) collapsing on scroll; time picker as inline/compact iOS picker; `KeyboardAvoidingView` for stop search.
- Haptic on Search submit and favorite toggle.

## 5. Android specifics
- Material time picker dialog; ripple on chips/buttons; keyboard handling with `windowSoftInputMode` adjust.
- Edge-to-edge; results scroll under nothing obstructive.

## 6. States
- **Loading:** stops loading → skeleton fields (not a bare spinner); search fetching → inline `LoadingState` above results.
- **Empty:** search returned none → `EmptyState` (`Bus` icon, "no routes", hint to try Directions).
- **Error:** search/stops error → `ErrorState` with retry.
- **Offline:** `Banner` (info) at top; Search/Directions disabled via `Button` disabled; favorites still selectable; show `offlineSearchDisabled` copy.

## 7. Motion & haptics
- Swap button animates the two fields exchanging (cross-fade/slide). Results fade in. Selected route expands with layout animation.

## 8. Accessibility
- Each `Field` labeled; swap button labeled "Swap origin and destination". Day/time controls announce selection. Search button announces enabled/disabled reason when offline.
- Vote buttons labeled with current counts.

## 9. Acceptance checklist
- [ ] Planner is one `Card` with `Field` rows, `MapPin`, and a working swap button.
- [ ] Native time picker replaces free-text time.
- [ ] Day selector + actions use `Chip`/`SegmentedControl` + `Button`; no hand-rolled styles.
- [ ] Vote glyphs are lucide; results/favorites use shared components.
- [ ] Loading/empty/error/offline all use `StateView`/`Banner`; light/dark; iOS + Android verified.
