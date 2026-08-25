# UI-SDD 61 — Marketplace Admin (superuser mobile)

**Routes:** `app/admin/marketplace/` → `/admin/marketplace` (guarded). Entry: Settings → Account → **Marketplace moderation** (visible only when `user.isSuperuser`).

---

## 1. Purpose

Let the Django superuser moderate marketplace UGC from the phone: pending **services**, **reviews**, and **user-suggested categories** — accept, reject, or edit — without opening Django admin.

## 2. Access control

- **Client:** `AuthUser.isSuperuser` from `GET /api/v3/auth/me` (refreshed on token hydrate). Settings row + `/admin/*` layout redirect non-superusers to `/settings`.
- **Server:** all `/api/v3/marketplace/admin/*` routes require `IsAuthenticated` + `user.is_superuser`. Legacy `/moderate` endpoints also require superuser (not `is_staff` alone).

## 3. Screens

| Route | Purpose |
|-------|---------|
| `index.tsx` | Hub: queue summary counts; tabs Providers / Reviews / Categories; inline Accept / Reject / Edit |
| `provider/[id].tsx` | `ProviderForm` in `mode="admin"` — promoted, verified, status + fields |
| `review/[id].tsx` | Star rating + text edit |
| `category/[id].tsx` | Name / slug / icon edit + **Approve** (`user_suggested=false`). No delete/reject on mobile (Django admin). |

## 4. API client

`lib/api.ts` — admin fetchers use token auth only (`Authorization` + `X-Island`). Hooks: `features/marketplace/hooks/useMarketplaceAdminQueries.ts`.

## 5. States

- Loading / error / empty per tab (`StateView` components).
- Pull-to-refresh on hub lists.
- Confirm dialogs before publish/reject.

## 6. i18n

Keys prefixed `marketplaceAdmin*` in `locales/en.json` and `locales/pt.json`.

## 7. Acceptance checklist

- [ ] Superuser sees Settings row and can open hub with correct pending counts.
- [ ] Accept/reject provider and review updates public listings.
- [ ] Approve category clears `userSuggested`; edit saves name/slug/icon.
- [ ] Non-superuser: no row, `/admin/marketplace` redirects, API returns 403.
- [ ] Category delete/reject remains Django admin only (footer note on categories tab).
