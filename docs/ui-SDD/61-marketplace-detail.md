# UI-SDD 61 — Marketplace Provider Detail

**Screen & route:** [`app/(tabs)/marketplace/[id].tsx`](../../app/(tabs)/marketplace/[id].tsx) → `/(tabs)/marketplace/[id]`. Components: `ContactRow`, `ReviewSheet`, `marketplace-store`.

---

## 1. Purpose
Full provider profile: identity, contacts, location/map, description, reviews, and (if owner) edit/delete. Plus leave a review.

## 2. Current state
Detail for a provider with `ContactRow`s and a `ReviewSheet`. Ownership-aware edit/delete via `marketplace-store`. Plain rows. Rebrand makes it a polished profile.

## 3. Rebrand direction
- **Header `Card`:** avatar/logo, name `title`, category `Badge`, rating summary (`Star` + average + count).
- **Primary contacts** as a row of `Button`/`IconButton`s: Call (`Phone`), Email (`Mail`), Website (`ExternalLink`), Directions (`Navigation`) — native intents. `ContactRow` restyled with leading icons + tokens.
- **Map `Card`** with provider marker (themed) → tap opens native maps.
- **Description** `body`; hours/details as labeled rows.
- **Reviews** list with `ReviewSheet` (shared `Sheet`: rating stars input + text) to add; reviews show author, `Star` rating, date, body.
- **Owner actions:** if `isMine`, show `Edit` (`Pencil`) + `Delete` (`Trash2`, danger) in header or an actions row; delete confirms via `Sheet`/dialog.

## 4. iOS specifics
- Collapsing header; native call/mail/maps; review sheet as form sheet; destructive delete uses iOS action sheet styling; haptic on submit/delete.

## 5. Android specifics
- Material app bar; ripple; native intents; Material dialog for delete confirm; edge-to-edge.

## 6. States
- **Loading:** skeleton header + contacts + map.
- **Error:** `ErrorState` + retry.
- **Offline:** cached profile; contact intents still work (tel/mailto); submitting reviews disabled with `Banner`.
- **Empty reviews:** `EmptyState` ("be the first to review").

## 7. Motion & haptics
- Header collapse; review sheet spring; haptic on submit review / confirm delete.

## 8. Accessibility
- Contact buttons labeled with action + provider; rating announced; owner actions labeled; delete confirmation clearly destructive.

## 9. Acceptance checklist
- [ ] Header card (avatar/name/category/rating) + contact action buttons (native intents).
- [ ] Themed map card; description; reviews list + `ReviewSheet`.
- [ ] Owner edit/delete with confirm; loading/error/offline/empty-reviews.
- [ ] Tokens only; iOS + Android verified.
