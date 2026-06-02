# UI-SDD 50 — News List

**Screen & route:** [`app/(tabs)/news/index.tsx`](../../app/(tabs)/news/index.tsx) → `/(tabs)/news`. Components: `NewsCard`, `NewsFilters`.

---

## 1. Purpose
Browse local news/announcements, filter by category + search, open an article. Editorial, readable feel.

## 2. Current state
`NewsFilters` (query + category, manual search trigger) + `FlatList` of `NewsCard`s with refresh, error/empty text. Works; needs editorial polish + design system.

## 3. Rebrand direction
- **`NewsCard` editorial layout.** Optional thumbnail (`Thumb`, right or top), title `headline` (2–3 line clamp), source/date `caption` with `Newspaper`/`Clock`, category `Badge` (`info` surface, `Tag`), short excerpt `body` muted. Featured (latest) card can be larger with full-width image.
- **`NewsFilters` → `SearchField` + `Chip` row** of categories (debounced search; drop the manual button or keep an explicit submit on keyboard return). Tokenized.
- Tokens, consistent gutters, comfortable line-height for reading.

## 4. iOS specifics
- Large title "News"; search field with cancel; card press scale.

## 5. Android specifics
- Material cards + ripple; refresh `primary`; edge-to-edge.

## 6. States
- **Loading:** skeleton cards.
- **Empty:** `EmptyState` (`Newspaper`, `newsEmpty`).
- **Error:** `ErrorState` (`newsLoadError`) + retry.
- **Offline:** last news cached ([`SDD/10`](../../SDD/10-frontend-architecture.md) §6); `Banner` + cached list.

## 7. Motion & haptics
- Cards fade in; category chip selection animates; image cross-fade.

## 8. Accessibility
- Card label: "{title}, {category}, {date}". Category by text + color. Search field labeled; results count announced.

## 9. Acceptance checklist
- [ ] `NewsCard` with thumbnail/title/excerpt/date + category badge; optional featured card.
- [ ] `SearchField` + category `Chip`s (debounced).
- [ ] Loading skeleton; empty/error/offline; tokens only; iOS + Android verified.
