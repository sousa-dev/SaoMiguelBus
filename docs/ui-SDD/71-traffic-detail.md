# UI-SDD 71 — Traffic Report Detail

**Screen & route:** [`app/(tabs)/traffic/[id].tsx`](../../app/(tabs)/traffic/[id].tsx) → `/(tabs)/traffic/[id]`.

---

## 1. Purpose
Full detail for one report/incident: category, location on map, time/status, description, and community confirmation (still there? / cleared) where supported.

## 2. Current state
Detail for a `TrafficReport`. Plain. Rebrand makes it a clear incident card.

## 3. Rebrand direction
- **Header `Card`:** category `Badge` (severity color + icon, e.g. `TriangleAlert`), status badge (`active` `success`/`warning`, `scheduled` `warning`, expired muted), reported time + relative time (`Clock`), and scheduled window (`CalendarClock`) when applicable.
- **Map `Card`** centered on the incident with a category marker (themed); tap → full map / native directions (`Navigation`).
- **Description** `body`; reporter attribution `caption` (pseudonymous).
- **Confirmation actions** (if supported): "Still there" / "Cleared" `Button`s (`ThumbsUp`/`Check`) with counts, optimistic + haptic.
- Tokens; tabular times.

## 4. iOS specifics
- Inline header + back; native directions; haptic on confirm; map insets.

## 5. Android specifics
- Material app bar; ripple; native maps intent; edge-to-edge.

## 6. States
- **Loading:** skeleton header + map.
- **Error:** `ErrorState` + retry.
- **Offline:** cached report; confirmation disabled with `Banner`.
- **Expired/resolved:** clearly badged; actions hidden.

## 7. Motion & haptics
- Confirm press animates count; haptic on confirm.

## 8. Accessibility
- Category/status announced as text + color; map text alternative; confirm buttons labeled with counts + user state.

## 9. Acceptance checklist
- [ ] Header card with category + status badges + times (incl. scheduled window).
- [ ] Themed incident map card + directions.
- [ ] Confirmation actions (if supported) optimistic + haptic.
- [ ] Loading/error/offline/expired; tokens only; iOS + Android verified.
