# UI-SDD 12 — Transit Directions

**Screen & route:** [`app/(tabs)/transit/directions.tsx`](../../app/(tabs)/transit/directions.tsx) → `/(tabs)/transit/directions` (pushed from Search). Component: `DirectionsResults` ([`features/transit/components/DirectionsResults.tsx`](../../features/transit/components/DirectionsResults.tsx)).

---

## 1. Purpose
Google-Maps-style multimodal directions (walk + bus legs) for the chosen origin/destination/day/time. Read-only result view.

## 2. Current state
`ScrollView` with a plain "origin → destination" title and `DirectionsResults`. Legs render with emoji (`🚶`, `🚌`) and middots. Functional but unstyled; emoji as transit-mode icons.

## 3. Rebrand direction
- **Journey header `Card`.** Origin → destination with an `ArrowRight`/route line, total duration + total walking distance as `Badge`s (`Clock`, `Footprints`). Use `headline` for endpoints.
- **Itinerary timeline.** Render legs as a vertical timeline: each leg a row with a mode icon chip (`Footprints` for walk, `Bus` for transit), line/route name, duration, and distance; connect with a vertical rule (`divider`). Replaces emoji + middot string in `DirectionsResults`.
- **Transit legs** show route/line label as a colored `Badge` (use `primary` or route color if available) and stop names; walk legs show distance/time muted.
- Tokens throughout; remove `🚶/🚌` literals.

## 4. iOS specifics
- Inline title (endpoints) + back chevron; large title not needed (it's a detail view).
- Smooth content inset under header; scroll bounces.

## 5. Android specifics
- Material back arrow; ripple on any tappable leg (if legs link to map later).
- Edge-to-edge bottom padding.

## 6. States
- **Loading:** `LoadingState` (centered) while fetching.
- **Error / none:** `EmptyState`/`ErrorState` with `Bus` icon + `noRoutesSubtitle` copy + a "Back to search" `Button`.
- **Offline:** directions require network — if reached offline, show `Banner` + disabled/empty content (Search already guards entry).

## 7. Motion & haptics
- Timeline legs fade/slide in sequentially (≤200ms, reduced-motion aware).

## 8. Accessibility
- Each leg is a labeled group: "Walk 5 min, 400 m" / "Bus 220 to X, 12 min". Mode icons decorative; text carries meaning.
- Duration/distance use tabular figures; sufficient contrast on badges.

## 9. Acceptance checklist
- [ ] Journey header card with total duration + walk distance badges.
- [ ] Legs rendered as an icon-based timeline; no emoji.
- [ ] Loading/error/empty via `StateView`; back CTA on empty.
- [ ] Tokens only; light/dark; iOS + Android verified.
