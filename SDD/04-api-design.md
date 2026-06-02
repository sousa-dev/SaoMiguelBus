# SDD 04 — API Design, Versioning & Legacy Compatibility

## 1. Conventions (djast)

- **DRF** via `api.py` + `serializers.py` + `urls.py` — thin HTTP layer, logic in `services.py` (see boilerplate `blog/api.py`).
- **Full CRUD by default for user-generated content** (events, marketplace listings, reviews, traffic reports): **ModelViewSet + DefaultRouter** exposing the standard REST verbs (see §2.1). Read-only/derived resources (transit, news, seismic, trails) use read ViewSets or generics.
- **Resource-oriented**, plural nouns: `/api/v3/transit/lines`, `/api/v3/news/articles`, `/api/v3/events`.
- **Tenant context** via `X-Island` header (or subdomain); never trust client-supplied island in the body.
- **Auth:** anonymous allowed for read-only public data; DRF token / allauth session for user writes; **partner API key** for third-party submission sites (see §2.3). See [`11-security-auth.md`](./11-security-auth.md).
- **Pagination:** cursor pagination on list endpoints (analytics, news, reports, listings).
- **Errors:** consistent envelope `{ "error": { "code", "message", "details" } }`.
- **Types:** OpenAPI schema generated server-side (`drf-spectacular`); TypeScript client types for Expo + a published, browsable API reference (single source of truth — see §7).
- **TDD is mandatory** for every endpoint (see §6): write failing `test_services.py` + `test_api.py` first, then implement.
- Wire v3 routes in `src/src/urls.py` (and per-app `urls.py`), gated by feature toggles like other boilerplate apps.

## 2. New API surface (`/api/v3`)

### 2.1 Standard CRUD contract (UGC resources)

Every user-generated-content resource is a full REST resource via `ModelViewSet`. The same verb set applies uniformly so external sites and the app share one predictable contract:

| Verb | Path | Action | Auth |
|------|------|--------|------|
| `GET` | `/{resource}` | list (filter, search, paginate) | public (published only) |
| `POST` | `/{resource}` | create (→ `status=pending` if moderated) | user token **or** partner key |
| `GET` | `/{resource}/{id}` | retrieve | public if published; owner/admin otherwise |
| `PUT` | `/{resource}/{id}` | full update | owner **or** admin |
| `PATCH` | `/{resource}/{id}` | partial update | owner **or** admin |
| `DELETE` | `/{resource}/{id}` | delete (soft-delete → `status=deleted`) | owner **or** admin |

Conventions for all CRUD resources:
- **Ownership:** writes set `created_by` (user) or `created_by_partner` (API key). Update/delete restricted to the owner or staff via a shared `IsOwnerOrReadOnly`/`IsOwnerOrStaff` permission in `common/permissions.py`.
- **Moderation lifecycle** (events, providers, reviews): `pending → published → rejected`, plus `deleted`. Public list/retrieve only returns `published`; owners also see their own non-published rows. Staff transition via `POST /{resource}/{id}/moderate {action}` or Django admin ([`09`](./09-modules.md), [`11`](./11-security-auth.md)).
- **Validation** in serializers + `services.py`; tenant `island` injected server-side, never from body.
- **Idempotency** for partner `POST` via optional `Idempotency-Key` header.

### 2.2 Endpoint surface by module

| Module | CRUD resources (full REST) | Read / action endpoints |
|--------|----------------------------|-------------------------|
| Bootstrap | — | `GET /bootstrap` (island config, modules, holidays, infos) |
| Transit | — (admin-managed via admin/import) | `GET /transit/stops`, `GET /transit/search`, `GET /transit/lines/{id}`, `GET /transit/directions`, `POST /transit/trips/{id}/vote` |
| News | — (feed-sourced) | `GET /news/articles`, `GET /news/sources` |
| Seismic | — (feed-sourced) | `GET /seismic/events`, `POST /seismic/events/{id}/felt` |
| **Marketplace** | `/marketplace/providers` (CRUD), `/marketplace/providers/{id}/reviews` (CRUD) | `GET /marketplace/categories`, `POST /marketplace/providers/{id}/moderate` |
| Trails | — (open-data sync) | `GET /trails`, `GET /trails/{id}`, `GET /trails/pois` |
| **Traffic** | `/traffic/reports` (CRUD) | `POST /traffic/reports/{id}/confirm`, `GET /traffic/reports?bbox=` |
| **Events / Tours** | `/events` (CRUD — **planned**) | **`GET /events/tours`**, **`GET /events/tours/{code}`** (Viator proxy — **shipped**); `POST /events/{id}/moderate`, `POST /events/{id}/promote` (**planned**) |
| Analytics | — | `POST /analytics/events` (consent-gated ingestion) |
| Consent | — | `GET/POST /consent`, `POST /privacy/dsar/export`, `POST /privacy/dsar/delete` |
| Billing | `/promotions` (create/list/cancel) | `GET /billing/entitlement`, `POST /billing/webhooks/stripe`, `POST /billing/webhooks/revenuecat` |
| Ads | `/ads/campaigns` (CRUD, partner/admin) | `GET /ads?slot=&platform=` (serve; compat `/api/v1/ad`) |

CRUD resources are bold above. Each is registered on a `DefaultRouter` in its app's `urls.py`, yielding the §2.1 verb set automatically.

### 2.3 Third-party / partner write access

External "post your event / list your business / submit a promotion" sites (separate front-ends for companies and people) authenticate as **partners**, not end-user accounts:

- **`PartnerApiKey`** (in `tenancy` or a small `partners` app): per-partner token, scoped to an `island` and a set of permitted resources/actions (e.g. `events:create`, `marketplace:create`). Issued/revoked from admin.
- Sent as `Authorization: Api-Key <key>` (DRF `HasAPIKey`-style permission). Distinct throttle scope from anonymous/user traffic.
- Partner-created rows are attributed (`created_by_partner`) and still enter the **moderation queue** before going public.
- Partner-facing endpoints are exactly the §2.1 CRUD verbs — no special surface — so a partner can `POST` to create, `PATCH` to edit, `DELETE` to withdraw their own submissions.
- A self-service **partner portal** can be built later on top of these same endpoints; nothing extra server-side is required.

### 2.4 Viator tours proxy (`events` app — shipped)

Read-only proxy to the **Viator Partner API** (`VIATOR_BASE_URL`, default `https://api.viator.com/partner`). No local tour DB — results are normalized in `events/services.py` and cached in Redis (TTL 3600s; destination lookup 24h).

| Method | Path | Query | Success |
|--------|------|-------|---------|
| GET | `/api/v3/events/tours` | `locale`, `currency` (default `EUR`), `sort` (default `DEFAULT`), `limit`/`count` (1–50, default 30), `start` (pagination, default 1) | `{ "tours": [TourSummary, …] }` |
| GET | `/api/v3/events/tours/{product_code}` | `locale`, `currency` | `TourDetail` (flat object) |

**`TourSummary`:** `code`, `title`, `thumbnailUrl`, `rating`, `reviewCount`, `fromPrice`, `currency`, `durationMinutes`, `bookingUrl` (affiliate params injected server-side).

**`TourDetail`** adds: `heroUrl`, `description`, `images: [{url, caption}]`, `flags: string[]`.

**Errors:** `400 island_required`, `404 not_found`, `502 viator_unavailable` (missing `VIATOR_API_KEY` or upstream failure).

**Env:** `VIATOR_API_KEY` (required for live data), `VIATOR_PARTNER_ID` (default `P00222801`), `VIATOR_CAMPAIGN` (default `sao-miguel-tours`), `VIATOR_DESTINATION_ID` (optional override), `VIATOR_BASE_URL`, `VIATOR_TIMEOUT` (default 25s).

**Module flag:** bootstrap exposes `events` in `enabledModules` when `Island.feature_flags.events` is true (migration `0010_enable_events_feature_flag`). The tours endpoints do **not** re-check the flag — gating is client-side.

## 3. Versioning strategy

- New canonical API is **`/api/v3`** (legacy already used v1 + v2).
- `/api/v1` and `/api/v2` are served by the **`compat`** app (`src/compat/`) translating new models → old shapes.
- Deprecation: compat endpoints emit `Deprecation` + `Sunset` headers; usage tracked via `AnalyticsEvent` to know when safe to remove.

## 4. Legacy URL inventory (full — all must be implemented in `compat` or explicitly dropped)

Source: [`legacy/src/SaoMiguelBus/urls.py`](../../SaoMiguelBus-api/legacy/src/SaoMiguelBus/urls.py).

### API v1

| Method | Path | Legacy handler | Compat priority |
|--------|------|----------------|-----------------|
| GET | `/api/v1/stops` | `get_all_stops_v1` | **P0** — Flutter, desktop |
| GET | `/api/v1/routes` | `get_all_routes_v1` | P1 |
| GET | `/api/v1/route` | `get_trip_v1` | **P0** — desktop search |
| GET | `/api/v1/route/<id>` | `get_route_v1` | P1 |
| GET | `/api/v1/android/load` | `get_android_load_v1` | P2 (superseded by v2) |
| GET | `/api/v1/stats` | `get_stats_v1` | P2 — admin |
| POST | `/api/v1/stat` | `add_stat_v1` | **P0** — all clients |
| GET | `/api/v1/ad` | `get_ad_v1` | **P0** |
| POST | `/api/v1/ad/click` | `click_ad_v1` | **P0** |
| GET | `/api/v1/groups` | `get_all_groups_v1` | P1 — ad targeting |
| POST | `/api/v1/info` | `set_info_v1` | P2 — admin write |
| GET | `/api/v1/info/active` | `get_active_infos_v1` | P1 |
| GET | `/api/v1/stats/group` | `get_group_stats_v1` | P2 — admin |
| GET | `/api/v1/infos` | `get_infos_v1` | P1 |
| GET | `/api/v1/gmaps` | `get_gmaps_v1` | **P0** — directions proxy |
| GET | `/api/v1/holidays` | `get_holidays_v1` | P1 |
| GET | `/api/v1/feriados` | `get_holidays_v1` (alias) | P1 |
| GET | `/api/v1/data/<id>` | `get_data_v1` | P2 — deprecated with Redis cache |
| * | `/api/v1/subscription/*` | `subscriptions.urls` | **P0** — verify endpoint |

Subscription routes (from `legacy/src/subscriptions/urls.py`): at minimum **`POST /api/v1/subscription/verify/`** with `{email}` → legacy response shape.

### API v2

| Method | Path | Legacy handler | Compat priority |
|--------|------|----------------|-----------------|
| GET | `/api/v2/android/load` | `get_android_load_v2` | **P0** — Android, Flutter |
| GET | `/api/v2/webapp/load` | `get_webapp_load_v2` | **P0** — web PWA |
| GET | `/api/v2/stops` | `get_all_stops_v2` | **P0** — web PWA |
| GET | `/api/v2/route` | `get_trip_v2` | **P0** — web PWA |
| POST | `/api/v2/like/<trip_id>` | `like_trip` | **P0** |
| POST | `/api/v2/dislike/<trip_id>` | `dislike_trip` | **P0** |
| POST | `/api/v2/reset/likes` | `reset_likes_dislikes` | P2 — admin only (no public magic key) |
| GET | `/api/v2/info/ad/<ad_id>` | `get_ad_info` | P1 |

### Other legacy routes

| Method | Path | Handler | Compat disposition |
|--------|------|---------|-------------------|
| GET | `statistics` | `stats` | P2 — admin dashboard; reimplement on `AnalyticsEvent` rollups |
| POST | `ai/api/v1/feedback` | `gather_feedback` | P2 → `analytics` or archive |
| GET/POST | `track_email_open/`, `get_email_opens/` | email tracking | P2 → `analytics` or retire |
| POST | `api/other/fix/stops` | `fix_stops` | **Drop** — one-off maintenance; not in compat |
| GET | `` (root) | `index` | N/A — legacy marketing page |

### Client → endpoint matrix (cutover checklist)

| Client | Required compat endpoints |
|--------|---------------------------|
| Web PWA | v2: `webapp/load`, `stops`, `route`; v1: `gmaps`, `stat`, `ad`, `ad/click`, `like/dislike`; subscription `verify` |
| Native Android | v2: `android/load`; v1: `stat`, `ad` |
| Flutter | v1: `stops`; v2: `android/load` |
| Desktop web | v1: `stops`, `route` |

All compat handlers scope to `island=sao-miguel` until multi-island clients ship.

### Implementation status (`SaoMiguelBus-api` `revamp`, 2026-06-02)

The revamp backend **substitutes for legacy production** for the web PWA: same URLs, same response shapes, backed by the normalized transit schema after `import_legacy`.

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| GET | `/api/v2/stops` | **Done** | `compat/api.py` |
| GET | `/api/v2/webapp/load` | **Done** | Bootstrap payload |
| GET | `/api/v2/route` | **Done** | Route search |
| POST | `/api/v2/like/<id>`, `/dislike/<id>` | **Done** | |
| GET | `/api/v1/stops` | **Done** | Desktop + Flutter |
| GET | `/api/v1/route` | **Done** | Desktop search |
| POST | `/api/v1/stat` | **Done** | Writes to new analytics |
| GET | `/api/v1/gmaps` | **Done** | Needs `GOOGLE_MAPS_API_KEY` |
| GET | `/api/v1/ad`, POST `/ad/click` | **Done** | |
| POST | `/api/v1/subscription/verify/` | **Done** | |
| GET | `/api/v3/marketplace/categories` | **Done** | Seeded defaults per island |
| GET/POST | `/api/v3/marketplace/providers` | **Done** | List (published only) + create (pending) |
| GET/PATCH/DELETE | `/api/v3/marketplace/providers/{id}` | **Done** | Owner via `X-Session-Id`; soft-delete |
| POST | `/api/v3/marketplace/providers/{id}/moderate` | **Done** | Staff only |
| GET/POST | `/api/v3/marketplace/providers/{id}/reviews` | **Done** | Upsert per session; rating recompute on publish |
| GET | `/api/v3/events/tours` | **Done** | Viator Partner API proxy; Redis cache; needs `VIATOR_API_KEY` |
| GET | `/api/v3/events/tours/{code}` | **Done** | Product detail + affiliate `bookingUrl` |
| GET | `/api/v2/android/load` | **Todo** | Native Android |
| GET | `/api/v1/routes`, `/route/<id>` | **Todo** | P1 |
| GET | `/api/v1/groups`, `/infos`, `/holidays` | **Todo** | P1 |
| GET | `/api/v1/stats`, `/stats/group` | **Todo** | P2 admin |

**Validated:** staging host (`staging.api.saomiguelbus.com`) serves web PWA traffic with compat handlers. **Cutover:** repoint `api.saomiguelbus.com` DNS to revamp backend — webapp already calls production hostname.

**Env required on revamp:** `AUTH_KEY`, `GOOGLE_MAPS_API_KEY`, `DEFAULT_ISLAND_KEY=sao-miguel`, `CORS_ALLOW_ALL_ORIGINS=True`, `VIATOR_API_KEY` (tours tab). See `SaoMiguelBus-api/AGENTS.md`.

> **Implementation note (UGC style):** §2.1 specifies `ModelViewSet + DefaultRouter` for UGC. The shipped `marketplace` module (first UGC module) instead uses DRF `@api_view` function views with explicit URL routing and service-layer dict serialization — consistent with every other v3 module in `src/` (no router infra exists). The REST contract (verbs, moderation lifecycle, ownership, throttling) is unchanged; only the view mechanism differs. Events/Traffic should follow the marketplace pattern.

### Shim behavior (examples)

```
GET /api/v2/route?origin=&destination=&day=&start=
   → transit.services.search_routes() → legacy ReturnRoute dict shape

GET /api/v2/webapp/load
   → bootstrap payload in legacy JSON shape

POST /api/v1/stat?request=...&origin=...   (query string, as legacy)
   → analytics.services.ingest_legacy_stat() → AnalyticsEvent

POST /api/v1/subscription/verify/  {email}
   → billing.services.verify_legacy_subscription() → { hasActiveSubscription, ... }
```

Shim is **write-translating** for `/stat` and **read-translating** for everything else.

## 5. Directions / Google Maps proxy

Legacy `/api/v1/gmaps` is a server-side proxy (holds the Google key, validates `key=AUTH_KEY` + client `version>=5`, geo-fences to island radius, caches in `Data`, parses into `Trip`/`TripStop`).

New design (`transit` app):
- Server-side proxy at `/api/v3/transit/directions`; compat keeps `/api/v1/gmaps` shape/params.
- Cache in **Redis** keyed by `(island, origin, destination, day, start, locale)` — not `Data` table.
- Geo-fence via `Island.center_lat/lng/radius_km`.
- Optional `Trip(source="gmaps")` + Celery TTL cleanup (replaces 30-day manual delete).

## 6. Rate limiting & abuse

- DRF throttles per `session_hash`/IP-bucket on write endpoints; **separate, stricter throttle scope for partner API keys**.
- Crowdsourced writes require account, signed anonymous session token, or partner key ([`11`](./11-security-auth.md)).

## 7. Build discipline — TDD (mandatory)

Every endpoint follows the boilerplate testing convention (`documentation/docs/1_get_started/5_testing.md`) in **test-first** order:

1. Write failing **`<app>/tests/test_services.py`** for the business rule (create/update/delete/moderation/ownership), using `@pytest.mark.django_db`.
2. Write failing **`<app>/tests/test_api.py`** for each CRUD verb: status codes, ownership/permission denials (403), tenant isolation (no cross-island leakage), moderation gating (pending not public), partner-key path, throttling.
3. Implement `services.py` → `serializers.py` → `api.py` until green.
4. Gate: **≥80% coverage on `<app>/services.py`** (`coverage report --fail-under=80`), per the boilerplate coverage policy. External services (Stripe, RevenueCat, Maps, RSS, EMSC) are **mocked**.

Delegate to the `djast-qa-test-engineer` agent for test scaffolding. No endpoint merges without its CRUD + permission tests.

## 8. API documentation (deliverable, not optional)

The API must be easy for third parties to consume. Each module that ships endpoints delivers:

- **OpenAPI schema** via `drf-spectacular` at `GET /api/v3/schema/` + interactive **Swagger UI / ReDoc** at `/api/v3/docs/`.
- A human guide page under the boilerplate **`documentation`** app: `documentation/docs/3_apps/<module>.md` covering auth (user token vs partner key), the CRUD verb table, request/response examples, filters, moderation states, and rate limits.
- A per-app **`AGENT_INSTRUCTIONS.md`** (mirroring `blog/AGENT_INSTRUCTIONS.md`) with `curl` + Python service-layer examples for agents/integrators creating content.
- A dedicated **"Partner API" guide** (`documentation/docs/.../partner_api.md`): how to get a key, scopes, idempotency, and end-to-end create→edit→withdraw examples for events/marketplace.

Docs updates ship **in the same PR** as the endpoint (boilerplate "user-visible changes must update docs" rule).
