# SDD 09 — Feature Modules

Each module = one **flat Django app** under `SaoMiguelBus-api/src/<module>/` (registered in `src/src/settings.py` `apps` toggle) + one Expo feature module (frontend). All tenant-scoped via `tenancy.TenantScopedModel`, all instrumented via `AnalyticsEvent`, all consent-aware. This doc specifies behavior and external dependencies; models are summarized in [`03-data-model.md`](./03-data-model.md); REST/CRUD contract in [`04-api-design.md`](./04-api-design.md).

**User-generated modules (Events, Marketplace, Traffic) expose full REST CRUD** (`ModelViewSet` + router — [`04`](./04-api-design.md) §2.1) so the app, partner sites, and integrators all create/edit/delete through the same endpoints, with ownership + moderation enforced server-side.

---

## 1. Transit (migrated core)

**Backend:** `transit` — normalized `Operator/Line/Stop/Trip/StopTime/Calendar` (replaces stringified-dict `Route`). API: `transit/api.py` + `services.py`.

**Features (parity + improvements):**
- Origin→destination search by day-type and start time (relational query on `StopTime`, fuzzy stop match via `pg_trgm`).
- Step-by-step directions via server-side Google Maps proxy (`/transit/directions`).
- Favorites (account-bound when logged in; local otherwise).
- Likes/dislikes on trips.
- Offline schedule cache (bootstrap payload cached client-side).
- Operator notices / alerts (`RouteInfo`, multilingual).

**Note on "real-time GPS / bus tracking":** legacy "bus tracking" is **schedule math + timers client-side**, not live operator GPS (no operator feed exists). Premium "real-time GPS alerts" therefore initially means **device-GPS proximity alerts** ("your stop is approaching", "report ahead on your route"), not live vehicle positions. Live vehicle data is a future integration gated on operator partnerships ([`12`](./12-risks-open-questions.md)).

---

## 2. Local News (daily utility)

**Backend:** `news` — `NewsSource(rss_url, language)`, `NewsArticle(...)`. Celery RSS tasks in `news/tasks.py`. Optional overlap: boilerplate `blog` can remain disabled or used for marketing SEO only.

**Pipeline:** Celery Beat task per source polls/parses RSS feeds from Azorean journals; dedupes by URL/hash; stores summary + canonical link (respect copyright — link out, don't republish full text); categorizes.

**Frontend:** News tab — list + filters (category, source, search); deep-link to source. Search/filter/open events tracked.

---

## 3. Earthquakes (daily utility)

**Backend:** `seismic` — `SeismicEvent`, `FeltReport`. Celery sync in `seismic/tasks.py`.

**Integration:** EMSC-CSEM API (https://www.emsc-csem.org/). Celery polling task fetches recent events near `Island.center/radius_km`; upserts by `emsc_id`. Respect their rate limits — cache + incremental fetch, not per-request proxy.

**Crowdsourcing:** "I felt it" → `POST /seismic/events/{id}/felt` with optional coarse location + intensity, pseudonymous `session_hash`. Aggregated felt-intensity map; premium users can get push alerts for events above a magnitude threshold near them.

---

## 4. Marketplace for local services

**Backend:** `marketplace` — `ServiceCategory`, `ServiceProvider`, `Review`.

**Model:** directory of local tradespeople. **100% free basic listings.** Monetization is **Pay-to-Promote only** ([`08`](./08-monetization-freemium.md)) — no commissions, no monthly fees.

**Features:** browse/search by category + location; provider profile (rate, contact, reviews, rating); submit review (rate-limited, moderated); contact via call/whatsapp/email. Promoted providers ranked higher with a transparent label.

**CRUD ([`04`](./04-api-design.md) §2.1):**
- `GET/POST /marketplace/providers`, `GET/PUT/PATCH/DELETE /marketplace/providers/{id}` — a business (user or partner key) creates/edits/withdraws its own listing.
- `GET/POST /marketplace/providers/{id}/reviews`, `PUT/PATCH/DELETE /marketplace/reviews/{id}` — review owner edits/deletes their own.
- `created_by`/`created_by_partner` ownership; `IsOwnerOrStaff`.

**Moderation:** new/edited listings + reviews enter `pending`; `POST /marketplace/providers/{id}/moderate` (staff) → `published`/`rejected`. Public list shows `published` only. Abuse controls in [`11`](./11-security-auth.md).

---

## 5. Tourist Guide & Trails (open data)

**Backend:** `trails` — `Trail`, `TrailStage`, `POI`. dados.gov.pt sync in `trails/tasks.py`.

**Integration:** Portuguese Open Data API (https://dados.gov.pt/pt/) — Celery sync of official Azorean trail datasets → `Trail`/`TrailStage`, keyed by `source_ref` for idempotent updates. Attribute the open-data source per licensing.

**Features:**
- Trails browse/detail with elevation, difficulty, geojson route.
- POIs + restaurants integrated with transit (how to reach a trailhead by bus).
- **Offline maps** — MapLibre + cached MBTiles/vector tiles for offline trail use ([`10`](./10-frontend-architecture.md)).
- **Micro-climate weather** — localized forecasts (Azores has sharp local variation); via a weather provider keyed by POI/trail coordinates.

---

## 6. Crowdsourced Traffic & Navigation (Waze-style)

**Backend:** `traffic` — `TrafficReport`. Expiry in `traffic/tasks.py`.

**Features:**
- User-reported alerts with location.
- **CRUD ([`04`](./04-api-design.md) §2.1):** `GET/POST /traffic/reports`, `GET/PUT/PATCH/DELETE /traffic/reports/{id}` — reporter edits/removes their own report; `POST /traffic/reports/{id}/confirm` (upvote) extends life; reports auto-expire (Celery).
- **Trust model:** confirmations raise confidence; unconfirmed reports expire fast; per-session rate limits; reputation weighting ([`11`](./11-security-auth.md)).
- **Live GPS push** (premium): alerts pushed when a user (with location + personalization consent) approaches an active report on their heading/route, via Expo Notifications.
- `GET /traffic/reports?bbox=` for map display.

---

## 7. Crowdsourced Events & Tours

**Backend:** `events` app (`src/events/`). **Shipped (2026-06):** Viator Partner API proxy only — no Django models, no admin, no Celery. **Planned:** `CommunityEvent` + community CRUD/moderation/promote ([`03`](./03-data-model.md), [`04`](./04-api-design.md) §2.1).

### Shipped — Viator affiliate tours

- **API:** `GET /api/v3/events/tours`, `GET /api/v3/events/tours/{product_code}` — live search/detail via Viator Partner API; normalized JSON + affiliate `bookingUrl` (`pid`, `campaign`, `medium=link`); Redis cache ≤1h ([`04`](./04-api-design.md) §2.4).
- **Config:** `VIATOR_API_KEY` required in prod; `VIATOR_PARTNER_ID=P00222801`, `VIATOR_CAMPAIGN=sao-miguel-tours`; São Miguel destination auto-resolved from `/destinations` unless `VIATOR_DESTINATION_ID` is set.
- **Enablement:** `Island.feature_flags.events` → bootstrap `enabledModules` includes `'events'` (migration `0010_enable_events_feature_flag` on `sao-miguel`).
- **Legacy webapp:** still embeds Viator `widget.js` in `SaoMiguelBus-webapp` — unchanged until PWA cutover.

### Shipped — Expo Tours tab

- **Tab route:** `app/(tabs)/tours/` (UI label "Tours"; module flag key remains **`events`**).
- **Feature code:** `features/events/` — `TourCard`, `useTours`/`useTour` (TanStack Query → v3 API), `viator.ts` fallback URL + `openViatorExternal()` via **`Linking.openURL`** (system Safari/Chrome — not `expo-web-browser`, so users keep Viator logins/cookies).
- **Screens:** list (`FlatList`), detail (`[tourId]`), book CTA opens `bookingUrl` from API.
- **Static merge:** `config/island.ts` unions bootstrap modules with `enabledModules: ['transit', 'events']` so the tab stays available if API flags lag.
- **Analytics (client):** `track('tours', 'view'|'open'|'book_click', …)` — module string `tours` in first-party events (backend `AnalyticsEvent` registry still lists `events`; align in a follow-up if needed).

### Planned — community events

- **CRUD ([`04`](./04-api-design.md) §2.1):** `GET/POST /events`, `GET/PUT/PATCH/DELETE /events/{id}` — locals/promoters (user token or partner key) create, edit, withdraw.
- Submissions enter `pending` → `POST /events/{id}/moderate` (staff) → `published`/`rejected`.
- Promoters **Pay-to-Promote** via `POST /events/{id}/promote` ([`08`](./08-monetization-freemium.md)).
- Calendar/list/map views; filter by date/category; tracked under `events` module.

---

## 8. PDL Mini Bus (urban Ponta Delgada)

**Backend:** `minibus` — `MinibusLine`, `MinibusTariff`, `MinibusDocument`, `MinibusImportMeta`. Catalog seeded from `minibus/data/catalog_sao_miguel.json`; PDFs/SVG imported via `import_minibus`.

**Data source:** [pdlminibus.pt](https://pdlminibus.pt) — attribution required in API responses and client UI.

**Features:**
- Line list with service windows (weekday hours; Saturday departures for C/D)
- Structured fare table + official PDF timetables, network map, schematic
- In-app PDF viewer (WebView on API file stream URLs)
- Entry from interurban Buses module (promo card + profile link)

**Not in v1:** stop-by-stop OCR/search, live vehicle tracking, ticket sales.

---

## Module enablement

Each module is gated by `Island.feature_flags` / frontend `enabledModules`, so a newly cloned island can launch transit-only and switch modules on later without code changes ([`02`](./02-multi-island-whitelabel.md)).
