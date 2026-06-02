# UI-SDD 20 — Tours List

**Screen & route:** [`app/(tabs)/tours/index.tsx`](../../app/(tabs)/tours/index.tsx) → `/(tabs)/tours`. Components: `TourCard` ([`features/events/components/TourCard.tsx`](../../features/events/components/TourCard.tsx)), `viator.ts`.

---

## 1. Purpose
Browse Viator tours/experiences; tap for detail; book opens the system browser (commission via `bookingUrl`). Revenue surface — should look premium and trustworthy.

## 2. Current state
Centered subtitle, `FlatList` of `TourCard`s with pull-to-refresh, empty/footer "browse all" links to Viator fallback. Clean structure; cards likely text-forward. Booking opens external browser ([`SDD/10`](../../SDD/10-frontend-architecture.md) §2.1).

## 3. Rebrand direction
- **Rich `TourCard`.** Hero image (`Avatar`/`Thumb` with rounded `radius.lg`, graceful fallback), title `headline` (2-line clamp), rating row (`Star` filled + value + reviews count via `Badge`/`caption`), "from {price}" as a prominent `Badge` using `accent` chip. Card elevation `raised`, full-width, image top.
- **Booking affordance.** External links get an `ExternalLink` icon to signal off-app navigation; footer "Browse all on Viator" as an outline `Button` with `ExternalLink`.
- **Attribution/commission** disclosure kept subtle (`caption`, `onSurfaceMuted`).
- **Subtitle/header** tightened to scale; optional category/price filters as a `Chip` row if API supports (else omit).

## 4. iOS specifics
- Large title "Tours"; image cards with subtle press scale; external open uses in-app Safari (`expo-web-browser`) or system browser per current `openViatorExternal`.

## 5. Android specifics
- Material cards + ripple; image corners clipped; refresh indicator `primary`.

## 6. States
- **Loading:** skeleton cards (image + 2 text lines) instead of bare spinner.
- **Empty:** `EmptyState` (`Ticket` icon, `toursEmpty`) + the Viator fallback `Button`.
- **Error:** `ErrorState` (`toursLoadError`) + retry + fallback link.
- **Offline:** tours need network; show `Banner` + cached list if any.

## 7. Motion & haptics
- Cards fade in; image cross-fades when loaded. Press scale.

## 8. Accessibility
- Card label: "{title}, rated {x} from {n} reviews, from {price}". External actions announce "Opens in browser". Images have alt via label; rating star decorative.

## 9. Acceptance checklist
- [ ] `TourCard` has image + clamped title + rating + "from price" badge.
- [ ] External actions use `ExternalLink` icon + "opens in browser" a11y.
- [ ] Loading skeleton, empty/error with fallback link.
- [ ] Tokens only; light/dark; iOS + Android verified.
