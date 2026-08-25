# UI-SDD 90 — Not Found (404 / Fallback)

**Screen & route:** [`app/+not-found.tsx`](../../app/+not-found.tsx) → catch-all for unknown routes / dead deep links.

---

## 1. Purpose
Graceful fallback when a route/deep link doesn't resolve. Low traffic but it shouldn't look broken or off-brand.

## 2. Current state
Expo starter default: legacy `Themed` `Text`/`View`, hardcoded English ("This screen doesn't exist.", "Go to home screen!"), a literal link color `#2e78b7`, and `Link href="/"`. Off-brand, not localized, not tokenized.

## 3. Rebrand direction
- **On-brand empty/error layout.** Use the shared `EmptyState`: a `Compass`/`MapPinOff` icon (`onSurfaceMuted`), title `title`, one-line explanation `body`, and a primary `Button` "Back to Hub" → `/(tabs)/hub` (not legacy `/`).
- Use `Screen` + theme tokens (drop `Themed` and the `#2e78b7` literal). Header title from i18n.
- **i18n:** add `notFoundTitle`, `notFoundBody`, `notFoundCta` to all 8 locales keyed off `pt.json`.
- Keep it lightweight; this screen rarely renders.

## 4. iOS specifics
- Inline header; safe-area centered content; standard back available.

## 5. Android specifics
- Material; hardware back returns; edge-to-edge; ripple on button.

## 6. States
- Single state. Works identically online/offline (Hub is local). Light/dark via tokens.

## 7. Motion & haptics
- Optional gentle icon fade-in. No haptics needed.

## 8. Accessibility
- Title + body readable and scalable; CTA labeled "Back to Hub"; icon decorative.

## 9. Acceptance checklist
- [ ] Uses `Screen` + `EmptyState` + `Button`; no `Themed`, no hex literals.
- [ ] Localized copy (8 locales); CTA routes to `/(tabs)/hub`.
- [ ] Light/dark; iOS + Android verified.
