# UI-SDD 10 — Hub (Landing)

**Screen & route:** [`app/(tabs)/hub/index.tsx`](../../app/(tabs)/hub/index.tsx) + [`_layout.tsx`](../../app/(tabs)/hub/_layout.tsx) → `/(tabs)/hub` (app entry, [`app/index.tsx`](../../app/index.tsx) redirects here).

---

## 1. Purpose
The branded front door. Every enabled island module is reachable from here as a tile; users pin up to 4 to the bottom bar and arrange the grid (grid/list, 2/3 columns). This is the screen that sets the tone for the whole rebrand.

## 2. Current state
`FlatList` of module tiles from `getEnabledHubModules()`; `HubModuleTile` shows a lucide icon in a tinted square, label, and (edit mode) pin + reorder chevrons. `HubEditControls` switches layout/columns. Header has Edit + Settings. Functional but plain: no hero/branding, flat tiles, no greeting, edit affordances are utilitarian.

## 3. Rebrand direction
- **Branded hero header.** Top region with island name (`display`) + short greeting/subtitle (`callout`, `onSurfaceMuted`), optionally time/space-aware ("Boa tarde"). Island logo token (`logoLight/Dark` from `IslandConfig`, [`SDD/02`](../../SDD/02-multi-island-whitelabel.md) §4) when available. iOS large title can host the island name.
- **Tiles → `Card`s.** Each tile uses the `Card` component: `surface`, `radius.lg`, `raised` elevation, icon in a `radius.md` tinted chip using the module `accent` at ~12% (`${accent}1f`), label `headline`, optional one-line subtitle/description (`caption`). Square-ish in grid; row with leading icon + chevron in list.
- **Module color identity.** Use each module's `accent` from `lib/modules.tsx` for its icon chip so the grid is scannable and colorful but still on neutral surfaces.
- **Pinned affordance.** Pinned modules show a small `Pin` badge (top-right of card) even outside edit mode, so users see what's on their bar. In edit mode, tapping toggles with haptic + spring; reorder via chevrons (drag is a deferred enhancement, see plan).
- **Edit mode polish.** `HubEditControls` becomes a `Card`/`Sheet`-style panel: `SegmentedControl` for grid/list and 2/3 columns; pin counter "Bar 3/4" with `Badge`; clear "full" `Banner` when capped (replaces the transient text hint).
- **Empty island** (no modules): `EmptyState` with `LayoutGrid` icon + explanation.

## 4. iOS specifics
- Large title "Hub" / island name; hero scrolls under the large title.
- Edit/Settings as header `IconButton`s; tile press = scale+opacity; pin toggle = `Haptics.selection()`.
- Grid respects safe-area side insets in landscape.

## 5. Android specifics
- Material card elevation + ripple on tile press; edit toggle ripple.
- Edge-to-edge; grid bottom padding clears the tab bar + gesture inset.
- Back in edit mode exits edit mode before leaving the screen.

## 6. States
- **Loading:** if bootstrap pending, show skeleton tiles (shimmer) rather than blank.
- **Empty:** `EmptyState` (no enabled modules).
- No error/offline state needed (module list is local/bootstrap-merged).

## 7. Motion & haptics
- Tiles fade/scale in on mount (`reanimated`, staggered ≤200ms, reduced-motion aware).
- Entering edit mode: tiles subtly lift (elevation/scale) to signal editability; pin toggles spring.
- Haptic on pin/unpin and reaching the cap.

## 8. Accessibility
- Each tile: `accessibilityRole="button"`, label = module name, hint = "Opens {module}". Pinned state via `accessibilityState={{ selected }}`.
- Edit controls labeled; pin counter announced; "bar full" uses `Banner` with `accessibilityRole="status"`.
- Icon chips are decorative (`accessibilityElementsHidden`) since the label carries meaning.

## 9. Acceptance checklist
- [ ] Branded hero (island name + greeting, logo token if present) above the grid.
- [ ] Tiles use `Card` + module `accent` chip; pinned badge visible outside edit mode.
- [ ] Edit mode uses `SegmentedControl` + pin counter `Badge` + "full" `Banner`.
- [ ] Loading skeleton; empty state; light/dark; iOS + Android verified.
- [ ] Pin toggle haptic; reduced-motion respected; a11y labels/states present.
