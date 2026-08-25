# UI-SDD 31 — Earthquake Detail

**Screen & route:** [`app/(tabs)/earthquakes/[id].tsx`](../../app/(tabs)/earthquakes/[id].tsx) → `/(tabs)/earthquakes/[id]`.

---

## 1. Purpose
Full detail for one seismic event: magnitude, location, depth, time, a focused map, and felt-vote / felt-count.

## 2. Current state
Detail for a `SeismicEvent`. Plain rows. Rebrand makes it a clear, scannable readout.

## 3. Rebrand direction
- **Hero magnitude.** Large magnitude number with a semantic `Badge`/ring (color by class), event location as `title`, exact time (`Clock`) + relative time, depth (`Waves`/`Ruler`), coordinates `caption`.
- **Mini map `Card`** centered on the epicenter with a single scaled marker; tap to open full map. Themed light/dark.
- **Felt summary + CTA.** "{n} people felt this" + a prominent "I felt it" `Button` (or thumbs) with haptic; reflects user's prior vote (`accessibilityState.selected`).
- **Share** action (`Share`) optional.
- Tokens, consistent gutters, tabular numerals.

## 4. iOS specifics
- Inline header + back; native share; haptic on vote; map respects insets.

## 5. Android specifics
- Material app bar; ripple; native share intent; edge-to-edge.

## 6. States
- **Loading:** skeleton hero + map placeholder.
- **Error:** `ErrorState` + retry.
- **Offline:** cached event shown; voting disabled with `Banner`.

## 7. Motion & haptics
- Magnitude ring/badge animates in; vote press feedback + haptic.

## 8. Accessibility
- Magnitude announced with units and class word ("Magnitude 4.1, strong"). Map has a text alternative. Vote button labeled with current count + user state.

## 9. Acceptance checklist
- [ ] Hero magnitude with semantic color + full metadata (time/depth/coords).
- [ ] Mini epicenter map card (themed) linking to full map.
- [ ] Felt count + vote `Button` with haptic + prior-vote state.
- [ ] Loading/error/offline; tokens only; iOS + Android verified.
