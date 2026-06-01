# SDD 04 — API Design, Versioning & Legacy Compatibility

## 1. Conventions (djast)

- **DRF** via `api.py` + `serializers.py` + `urls.py` — thin HTTP layer, logic in `services.py` (see boilerplate `blog/api.py`).
- ViewSets + Routers where a full CRUD resource fits; **generics** (`ListCreateAPIView`, etc.) for simpler endpoints.
- **Resource-oriented**, plural nouns: `/api/v3/transit/lines`, `/api/v3/news/articles`.
- **Tenant context** via `X-Island` header (or subdomain); never trust client-supplied island in the body.
- **Auth:** anonymous allowed for read-only public data; DRF token (allauth session) for writes. See [`11-security-auth.md`](./11-security-auth.md).
- **Pagination:** cursor pagination on list endpoints (analytics, news, reports).
- **Errors:** consistent envelope `{ "error": { "code", "message", "details" } }`.
- **Types:** OpenAPI schema generated server-side; TypeScript client types for Expo (single source of truth).
- Wire v3 routes in `src/src/urls.py` (and per-app `urls.py`), gated by feature toggles like other boilerplate apps.

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
| Ads | `GET /ads?slot=&platform=` (first-party; compat: `/api/v1/ad`) |

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

- DRF throttles per `session_hash`/IP-bucket on write endpoints.
- Crowdsourced writes require account or signed anonymous session token ([`11`](./11-security-auth.md)).
