# UI-SDD 60 — Marketplace List

**Screen & route:** [`app/(tabs)/marketplace/index.tsx`](../../app/(tabs)/marketplace/index.tsx) → `/(tabs)/marketplace`. Components: `MarketplaceFilters`, `ProviderCard`.

---

## 1. Purpose
Find local service providers — search, filter by category, "near me", open detail, and add your own listing (FAB). Directory feel.

## 2. Current state
`MarketplaceFilters` (search + category + near-me) + `FlatList` of `ProviderCard`s with refresh, error/empty text, and a bottom-right `+ Add listing` pill (`fab`). Functional; FAB and filters need the design system; near-me uses raw `navigator.geolocation`.

## 3. Rebrand direction
- **`ProviderCard`.** Logo/avatar (`Avatar` with initial fallback), name `headline`, category `Badge` (`Store`/`Tag`), rating (`Star` + value) if present, short location/distance `caption` with `MapPin`, quick-contact icons (`Phone`/`Mail`/`Navigation`) as `IconButton`s on the card.
- **`MarketplaceFilters` → `SearchField` + `Chip` row + near-me `Chip`/toggle** (`Crosshair`). Use `expo-location` properly for native near-me (current `navigator.geolocation` only works on web) — request permission, handle denied with a `Banner`.
- **FAB → shared `Fab`** (extended, `primary`, `Plus`), consistently placed above tab bar + safe area.
- Tokens; "mine" listings get an `Badge`/edit affordance (ownership via `marketplace-store`).

## 4. iOS specifics
- Large title "Services"; FAB respects home indicator; contact actions use native tel/mailto/maps; haptic on add.

## 5. Android specifics
- Material FAB + ripple; native intents for call/email/maps; edge-to-edge; FAB above gesture inset.

## 6. States
- **Loading:** skeleton cards.
- **Empty:** `EmptyState` (`Store`, `marketplaceEmpty`) + add CTA.
- **Error:** `ErrorState` (`marketplaceLoadError`) + retry.
- **Offline:** `Banner`; cached list browsable; add disabled offline.
- **Location denied:** `Banner` explaining near-me unavailable.

## 7. Motion & haptics
- Cards fade in; FAB optional scale on scroll (shrink to icon-only); haptic on add tap.

## 8. Accessibility
- Card label includes name/category/rating/distance; contact buttons labeled ("Call {name}"). FAB labeled. Near-me toggle announces state.

## 9. Acceptance checklist
- [ ] `ProviderCard` with avatar, category badge, rating, quick-contact icon buttons.
- [ ] Filters use `SearchField`/`Chip`; near-me uses `expo-location` with denied `Banner`.
- [ ] Shared `Fab` for add; loading/empty/error/offline; tokens only; iOS + Android verified.
