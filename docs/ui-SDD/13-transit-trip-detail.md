# UI-SDD 13 — Transit Trip Detail

**Screen & route:** [`app/(tabs)/transit/[tripId].tsx`](../../app/(tabs)/transit/[tripId].tsx) → `/(tabs)/transit/[tripId]`. Related inline component: `TripDetail` ([`features/transit/components/TripDetail.tsx`](../../features/transit/components/TripDetail.tsx)).

---

## 1. Purpose
Full detail for a single route/trip: stop sequence with times, route metadata, and the like/dislike sentiment. Currently `TripDetail` renders inline under search results; this is the dedicated detail surface.

## 2. Current state
`TripDetail` shows the selected trip; `[tripId]` is the routed detail. Sentiment uses `👍/👎` with percentages in `RouteResults`. Plain text rows.

## 3. Rebrand direction
- **Header `Card`:** route name/number as `Badge` + origin→destination, day + departure time as `Clock`/`CalendarDays` badges.
- **Stop sequence timeline:** vertical list of stops with times (tabular figures), origin/destination emphasized, a connecting rule; highlight the user's boarding/alighting stops.
- **Sentiment block:** `ThumbsUp`/`ThumbsDown` `IconButton`s with counts/percent and semantic colors (`success`/`danger` tint), replacing emoji; tapping votes (optimistic, haptic). Show "X% found this helpful".
- **Favorite** this O/D pair via `Star` `IconButton` in the header.
- **Share** action (optional) in header (`Share` icon) to share the trip.

## 4. iOS specifics
- Inline title (route), large title optional; haptic on vote/favorite; share uses native share sheet.

## 5. Android specifics
- Material app bar; ripple on vote/favorite; native share intent.

## 6. States
- **Loading:** skeleton header + stop rows.
- **Error:** `ErrorState` + retry.
- **Offline:** show cached trip if available (TanStack persistence); disable voting with a `Banner` note.

## 7. Motion & haptics
- Vote press animates count change; favorite star fills with spring + haptic.

## 8. Accessibility
- Stops list is a labeled sequence; current stops announced. Vote buttons labeled with counts and current user state (`accessibilityState.selected`).

## 9. Acceptance checklist
- [ ] Header card with route + schedule badges + favorite star.
- [ ] Stop timeline with tabular times; boarding/alighting highlighted.
- [ ] Sentiment uses lucide thumbs + semantic colors; optimistic + haptic.
- [ ] Loading/error/offline handled; tokens only; iOS + Android verified.
