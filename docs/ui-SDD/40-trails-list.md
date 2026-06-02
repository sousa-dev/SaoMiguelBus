# UI-SDD 40 — Trails List

**Screen & route:** [`app/(tabs)/trails/index.tsx`](../../app/(tabs)/trails/index.tsx) → `/(tabs)/trails`. Components: `TrailCard`, `TrailFilters`, `TrailMap`, `TrailWeather`.

---

## 1. Purpose
Discover hiking trails with filters (difficulty/length/etc.), see each on a card, open detail with map + weather. Outdoorsy, inviting feel.

## 2. Current state
`TrailFilters` bar + `FlatList` of `TrailCard`s with refresh, error text, empty text, and an attribution footer. Solid; cards/filters need the design system + richer media.

## 3. Rebrand direction
- **`TrailCard` with media.** Cover image (`Thumb`, `radius.lg`, fallback `Mountain`), name `headline`, difficulty `Badge` (semantic: easy `success` / moderate `warning` / hard `danger`), length + duration + elevation as `caption` with `Ruler`/`Clock`/`Mountain` icons. Optional location/region chip.
- **`TrailFilters` → `Chip` row + `SearchField`.** Difficulty/length as selectable `Chip`s; reset as ghost `Button`. Consider a map/list `SegmentedControl` if a list-wide map is desired.
- **Attribution footer** kept as subtle `caption`.
- Tokens throughout; consistent gutters.

## 4. iOS specifics
- Large title "Trails"; card press scale; image cross-fade.

## 5. Android specifics
- Material cards + ripple; refresh `primary`; edge-to-edge.

## 6. States
- **Loading:** skeleton cards (image + 2 lines).
- **Empty:** `EmptyState` (`Footprints`/`Mountain`, `trailsEmpty`).
- **Error:** `ErrorState` (`trailsLoadError`) + retry.
- **Offline:** trails cached ([`SDD/10`](../../SDD/10-frontend-architecture.md) §6); show `Banner`, allow browsing cached.

## 7. Motion & haptics
- Cards fade in; filter chip selection animates.

## 8. Accessibility
- Card label: "{name}, {difficulty}, {length}, {duration}". Difficulty conveyed by text + color. Filter chips announce selection.

## 9. Acceptance checklist
- [ ] `TrailCard` with cover image + difficulty badge + metric icons.
- [ ] Filters use `Chip`/`SearchField`; tokens only.
- [ ] Loading skeleton; empty/error/offline via `StateView`/`Banner`.
- [ ] Light/dark; iOS + Android verified.
