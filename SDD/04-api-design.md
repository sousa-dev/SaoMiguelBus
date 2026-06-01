# SDD 04 — API Design, Versioning & Legacy Compatibility

## 1. Conventions

- **DRF ViewSets + Routers** (replacing legacy `@api_view` function views).
- **Resource-oriented**, plural nouns: `/api/v3/transit/lines`, `/api/v3/news/articles`.
- **Tenant context** via `X-Island` header (or subdomain); never trust client-supplied island in the body.
- **Auth:** anonymous allowed for read-only public data; token/JWT required for writes that need identity (reviews, event submission, account-bound favorites). See [`11-security-auth.md`](./11-security-auth.md).
- **Pagination:** cursor pagination on list endpoints (analytics, news, reports).
- **Errors:** consistent envelope `{ "error": { "code", "message", "details" } }`.
- **Types:** OpenAPI schema generated server-side; TypeScript client types generated for the Expo app (single source of truth).

## 2. New API surface (`/api/v3`)

| Module | Representative endpoints |
|--------|--------------------------|
| Bootstrap | `GET /api/v3/bootstrap` → island config, enabled modules, holidays, active infos (replaces `/api/v2/webapp/load`) |
| Transit | `GET /transit/stops`, `GET /transit/search?origin=&destination=&day=&start=`, `GET /transit/lines/{id}`, `GET /transit/directions` (Maps proxy), `POST /transit/trips/{id}/vote` |
| News | `GET /news/articles?category=`, `GET /news/sources` |
| Seismic | `GET /seismic/events?since=`, `POST /seismic/events/{id}/felt` |
| Marketplace | `GET /marketplace/providers?category=&q=`, `GET /marketplace/categories`, `POST /marketplace/providers/{id}/reviews` |
| Trails | `GET /trails`, `GET /trails/{id}`, `GET /trails/pois` |
| Traffic | `GET /traffic/reports?bbox=`, `POST /traffic/reports`, `POST /traffic/reports/{id}/confirm` |
| Events | `GET /events?from=&to=`, `POST /events`, `GET /events/tours` (Viator) |
| Analytics | `POST /analytics/events` (consent-gated ingestion) |
| Consent | `GET/POST /consent`, `POST /privacy/dsar/export`, `POST /privacy/dsar/delete` |
| Billing | `GET /billing/entitlement`, `POST /billing/webhooks/stripe`, `POST /billing/webhooks/revenuecat`, `POST /promotions` |

## 3. Versioning strategy

- New canonical API is **`/api/v3`** (legacy already used v1 + v2).
- `/api/v1` and `/api/v2` are served by the **compat app** (`apps/compat`) translating new models → old shapes.
- Deprecation: compat endpoints emit a `Deprecation` + `Sunset` header; we track their usage via analytics to know when it's safe to remove.

## 4. Legacy compatibility shim (critical for zero-downtime cutover)

Existing clients in the wild that must keep working during migration:

| Client | Depends on |
|--------|-----------|
| Web PWA (current) | `/api/v2/webapp/load`, `/api/v2/stops`, `/api/v2/route`, `/api/v1/gmaps`, `/api/v1/stat`, `/api/v1/ad`, `/api/v1/ad/click`, `/api/v2/like|dislike/{id}`, `/api/v1/subscription/verify/` |
| Native Android (Play Store) | `/api/v2/android/load`, `/api/v1/stat`, `/api/v1/ad` |
| Flutter (release) | `/api/v1/stops`, `/api/v2/android/load` |
| Desktop web | `/api/v1/stops`, `/api/v1/route` |

The compat app re-implements each of these against the new schema, always scoped to `island=sao-miguel`:

```
GET /api/v2/route?origin=&destination=&day=&start=
   → resolve origin/destination Stop via cleaned_name trigram match
   → query StopTime/Trip on the right Calendar
   → serialize to legacy ReturnRoute dict shape (start/end/stops map/likes_percent...)

GET /api/v2/webapp/load
   → assemble routes + stops + holidays + infos in legacy payload shape

POST /api/v1/stat?request=...&origin=...      (params in query string, as legacy does)
   → translate into AnalyticsEvent(module="transit", ...) under consent rules

POST /api/v1/subscription/verify/  {email}
   → look up Entitlement(source="legacy_email"/...) → legacy response
        { hasActiveSubscription, subscriptionType, expiresAt, features, message }
```

The shim is **write-translating** for `/stat` (legacy stat → AnalyticsEvent) and **read-translating** for everything else. It lets us migrate the data and backend first, then move clients to v3 at our own pace.

## 5. Directions / Google Maps proxy

Legacy `/api/v1/gmaps` is a server-side proxy (holds the Google key, validates `key=AUTH_KEY` + client `version>=5`, geo-fences results to the island radius, caches raw responses in the `Data` table, and parses them into `Trip`/`TripStop`).

New design:
- Keep server-side proxy (don't ship Maps keys to clients — legacy leaks both the proxy `AUTH_KEY` and the Maps key in client source; we fix this — see [`11`](./11-security-auth.md)).
- Cache raw responses in **Redis** keyed by `(island, origin, destination, day, start, locale)` instead of an unbounded `Data` table.
- Geo-fence using `Island.center/radius_km` instead of the hardcoded constant.
- Optionally persist derived trips as `Trip(source="gmaps")` for analytics, with TTL cleanup via Celery (replaces the manual 30-day delete loop).

## 6. Rate limiting & abuse

- DRF throttles per session_hash/IP-bucket on write endpoints (votes, reviews, traffic reports, felt reports, event submissions).
- Crowdsourced writes require either an account or a signed anonymous session token; trust/confirmation model in [`11`](./11-security-auth.md).
