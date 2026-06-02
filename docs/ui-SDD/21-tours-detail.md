# UI-SDD 21 — Tour Detail

**Screen & route:** [`app/(tabs)/tours/[tourId].tsx`](../../app/(tabs)/tours/[tourId].tsx) → `/(tabs)/tours/[tourId]`.

---

## 1. Purpose
Full tour detail: gallery, description, highlights, price, rating, and the primary "Book" CTA (opens Viator in browser). Conversion surface.

## 2. Current state
Detail screen for a `TourDetail` (images, price, reviews); book opens external. Structure exists; rebrand makes it feel like a polished product page.

## 3. Rebrand direction
- **Image gallery hero.** Full-bleed image carousel (paged `FlatList`/`reanimated`) with page dots; falls back to single image/placeholder. Title overlays or sits directly below in `title`.
- **Key facts row:** rating (`Star`), duration (`Clock`), price "from {price}" `Badge` (`accent`). 
- **Description & highlights:** `body` text; highlights as a bulleted/`Check`-icon list.
- **Sticky book bar.** Pinned bottom `Button` (primary, full-width, leading `Ticket`/`ExternalLink`) "Book from {price}" above safe-area; communicates external navigation.
- Tokens; rounded media; consistent gutters.

## 4. iOS specifics
- Inline/transparent header over hero that solidifies on scroll; large back chevron; book bar respects home indicator; native share optional.

## 5. Android specifics
- Collapsing toolbar feel (image → app bar on scroll); ripple on book; sticky bar above gesture inset.

## 6. States
- **Loading:** skeleton hero + text lines.
- **Error:** `ErrorState` + retry + "Browse all" fallback.
- **Offline:** `Banner`; book disabled offline.

## 7. Motion & haptics
- Gallery paging; header solidify on scroll; haptic on book tap.

## 8. Accessibility
- Gallery images labeled / swipe announced; book button labeled "Book {title} from {price}, opens in browser". Sufficient contrast on overlay text (scrim behind title).

## 9. Acceptance checklist
- [ ] Image gallery hero with page indicators + fallback.
- [ ] Key facts (rating/duration/price) as badges/icons.
- [ ] Sticky external "Book" bar above safe-area.
- [ ] Loading/error/offline; tokens only; iOS + Android verified.
