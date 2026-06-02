# UI-SDD 51 — News Article

**Screen & route:** [`app/(tabs)/news/[articleId].tsx`](../../app/(tabs)/news/[articleId].tsx) → `/(tabs)/news/[articleId]`.

---

## 1. Purpose
Read a full article: title, meta, hero image, body content, and share/source link. Reading-optimized.

## 2. Current state
Article detail for a news item. Plain. Rebrand makes it a clean reader.

## 3. Rebrand direction
- **Hero image** (full-width, `radius` only at content edges or full-bleed), title `title`/`display`, byline/source + date `caption` with `Newspaper`/`Clock`, category `Badge`.
- **Readable body.** `body` type with generous `lineHeight`, proper paragraph spacing; support basic rich content (links open via `expo-web-browser`/in-app browser with `ExternalLink` affordance). Constrain measure on wide screens/web.
- **Share** action in header (`Share`); "Open original" link if external source.
- Tokens; comfortable gutters; image fallback.

## 4. iOS specifics
- Transparent→solid header over hero on scroll; native share; Dynamic Type respected (don't clamp body).

## 5. Android specifics
- Collapsing toolbar; native share intent; ripple on links.

## 6. States
- **Loading:** skeleton hero + text lines.
- **Error:** `ErrorState` + retry.
- **Offline:** show cached article if available; external links show `Banner` when unreachable.

## 7. Motion & haptics
- Header solidify on scroll; image fade-in.

## 8. Accessibility
- Body supports font scaling; images have alt (label/caption); links labeled with destination; heading structure exposed.

## 9. Acceptance checklist
- [ ] Hero + title + byline/date + category badge.
- [ ] Readable, scalable body with proper spacing; external links flagged.
- [ ] Share action; loading/error/offline; tokens only; iOS + Android verified.
