# SDD 09 — Feature Modules

Each module = one **flat Django app** under `SaoMiguelBus-api/src/<module>/` (registered in `src/src/settings.py` `apps` toggle) + one Expo feature module (frontend). All tenant-scoped via `tenancy.TenantScopedModel`, all instrumented via `AnalyticsEvent`, all consent-aware. This doc specifies behavior and external dependencies; models are summarized in [`03-data-model.md`](./03-data-model.md).

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

**Moderation:** new listings/reviews pass through a moderation queue (admin); abuse controls in [`11`](./11-security-auth.md).

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
- `POST /traffic/reports`; `POST /traffic/reports/{id}/confirm` (upvote) extends life; reports auto-expire (Celery).
- **Trust model:** confirmations raise confidence; unconfirmed reports expire fast; per-session rate limits; reputation weighting ([`11`](./11-security-auth.md)).
- **Live GPS push** (premium): alerts pushed when a user (with location + personalization consent) approaches an active report on their heading/route, via Expo Notifications.
- `GET /traffic/reports?bbox=` for map display.

---

## 7. Crowdsourced Events & Tours

**Backend:** `events` — `CommunityEvent`, `ViatorListing`.

**Features:**
- Locals submit events → moderation queue → published.
- Promoters **Pay-to-Promote** events to the top ([`08`](./08-monetization-freemium.md)).
- **Viator** affiliate tours surface (passive commission) integrated here.
- Calendar/list/map views; filter by date/category; tracked.

---

## Module enablement

Each module is gated by `Island.feature_flags` / frontend `enabledModules`, so a newly cloned island can launch transit-only and switch modules on later without code changes ([`02`](./02-multi-island-whitelabel.md)).
