# UI-SDD 30 — Earthquakes (Map + List)

**Screen & route:** [`app/(tabs)/earthquakes/index.tsx`](../../app/(tabs)/earthquakes/index.tsx) → `/(tabs)/earthquakes`. Components: `SeismicMap`, `SeismicMapMarker`, `EarthquakeCard`, `FeltVoteSheet`.

---

## 1. Purpose
Monitor recent seismic activity on a map or list, filter by time window, tap a marker/card for detail, and submit a "felt it" vote. Safety-relevant — clarity and trust matter.

## 2. Current state
Map/list toggle (native only), a time-window chip row (24h/3d/7d/30d), `SeismicMap` with markers + an overlay empty card, or a `FlatList` of `EarthquakeCard`s with refresh. `FeltVoteSheet` opens on marker press. The empty-card already uses platform shadow/elevation. Toggle + chips are hand-rolled.

## 3. Rebrand direction
- **Toggle → `SegmentedControl`** (Map | List) using tokens; **window chips → `Chip` row** (or a compact segmented). Put both in a clean filter bar with `divider` under it.
- **Magnitude as semantic `Badge`.** Color-code by magnitude class (e.g. <2 `info`, 2–4 `warning`, ≥4 `danger`) on cards and markers; `SeismicMapMarker` size/color scales with magnitude. `EarthquakeCard`: magnitude badge (large, tabular), location `headline`, depth + time `caption` with `Clock`, distance-from-user if available.
- **Map polish.** Themed map style (light/dark), user location dot, marker clustering at wide windows, and the existing overlay empty card swapped to `EmptyState`/`Banner` tokens. Recenter `IconButton` (`Crosshair`).
- **Felt vote** via shared `Sheet` (grabber, title, `ThumbsUp`/big "I felt it" `Button`), replacing bespoke sheet styling; haptic on submit.

## 4. iOS specifics
- Large title "Earthquakes"; map respects safe areas; sheet is a native page/form sheet; haptic on vote.

## 5. Android specifics
- Material segmented + ripple chips; map attribution legible; sheet handles back; edge-to-edge.

## 6. States
- **Loading:** list skeleton; map shows spinner overlay.
- **Empty:** `EmptyState` (`Activity` icon, `seismicEmpty` / `seismicMapEmpty` + hint) — unify the two current empties.
- **Error:** `ErrorState` (`seismicLoadError`) + retry.
- **Offline:** `Banner`; show cached events; voting disabled offline.

## 7. Motion & haptics
- Marker press animates selection; sheet springs; window change cross-fades list. Haptic on felt-vote.

## 8. Accessibility
- Magnitude badges include text ("M3.2"), not color alone. Markers expose labels. Segmented/chips announce selection. Vote sheet fully labeled.

## 9. Acceptance checklist
- [ ] Map/list `SegmentedControl` + window `Chip`s on a tokenized filter bar.
- [ ] Magnitude semantic badges + scaled markers; themed map; recenter button.
- [ ] Felt vote uses shared `Sheet` + haptic.
- [ ] Unified empty/error/offline via `StateView`/`Banner`; light/dark; iOS + Android verified.
