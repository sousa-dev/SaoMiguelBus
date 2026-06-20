# UI-SDD 60 — Marketplace List

**Screen & route:** [`app/(tabs)/marketplace/index.tsx`](../../app/(tabs)/marketplace/index.tsx) → `/(tabs)/marketplace`. Components: `MarketplaceToolbar`, `MarketplaceFilterSheet`, `ProviderCard`, `MarketplaceRegisterCta`.

---

## 1. Purpose
Find local service providers — search, filter/sort by category, location, rating, and rate; open detail; add your own listing (top/inline CTAs + FAB). Directory feel with fair random default ordering.

## 2. Current state
`MarketplaceToolbar` (search + sort chips + filter sheet) + `FlatList` of dense `ProviderCard`s (no avatars), top/inline/footer add-service CTAs, refresh, error/empty with add action. Near-me uses `expo-location` via `useNearbyLocation`.

## 3. Rebrand direction
- **`ProviderCard`.** Full title (2 lines), category + promoted + verified `Badge`s, bio, hourly rate, distance when near-me, rating row, quick-contact `IconButton`s (phone/WhatsApp/email/map). **No avatar.**
- **`MarketplaceToolbar` → `SearchField` + horizontal sort `Chip`s + filter sheet** (category search, near-me, min rating, has rate, verified). Denied location → `Banner`.
- **Add-service CTAs:** compact card in list header, periodic inline every N items, full footer card, FAB speed-dial, empty-state action.
- Tokens; "mine" listings get edit affordance on detail (ownership via `marketplace-store`).

## 4. iOS specifics
- Large title "Services"; FAB respects home indicator; contact actions use native tel/mailto/maps; haptic on filter open.

## 5. Android specifics
- Material FAB + ripple; native intents for call/email/maps; edge-to-edge; FAB above gesture inset.

## 6. States
- **Loading:** skeleton cards.
- **Empty:** `EmptyState` (`Store`, `marketplaceEmpty`) + add CTA.
- **Error:** `ErrorState` (`marketplaceLoadError`) + retry.
- **Offline:** `Banner`; cached list browsable; add disabled offline.
- **Location denied:** `Banner` explaining near-me unavailable.

## 7. Motion & haptics
- Cards fade in; haptic on filter sheet open.

## 8. Accessibility
- Card label includes name/category/rating/distance; contact buttons labeled. FAB labeled. Near-me toggle announces state.

## 9. Acceptance checklist
- [ ] `ProviderCard` without avatar; category/promoted/verified badges; rate; quick-contact icon buttons.
- [ ] `MarketplaceToolbar` with sort chips + filter sheet; near-me uses `expo-location` with denied `Banner`.
- [ ] Add-service CTAs at top, inline during scroll, footer, empty state; shared `Fab` retained.
- [ ] Loading/empty/error/offline; tokens only; iOS + Android verified.
