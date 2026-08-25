# SDD 03 — Data Model & Legacy Mapping

All models inherit `tenancy.TenantScopedModel` (`island` FK) unless noted. Each module is a flat Django app under `SaoMiguelBus-api/src/<app>/`. Types are indicative; exact field options finalized during Phase 1. Migration mechanics: [`05-data-migration.md`](./05-data-migration.md).

## 1. Legacy model inventory (complete audit)

Source: [`legacy/src/app/models.py`](../../SaoMiguelBus-api/legacy/src/app/models.py), [`legacy/src/subscriptions/models.py`](../../SaoMiguelBus-api/legacy/src/subscriptions/models.py).

| Legacy model | App | New disposition |
|--------------|-----|-----------------|
| `Route` | `app` | → `transit.Line` + `Trip` + `StopTime` (parse `stops` str-dict) |
| `Stop` | `app` | → `transit.Stop` (1:1) |
| `Trip` | `app` | GMaps-derived schedules → `transit.Trip(source="gmaps")` or ephemeral; not bulk-migrated |
| `TripStop` | `app` | Coordinates backfill for `Stop`; not kept as separate table |
| `Data` | `app` | **Not migrated** — raw GMaps JSON cache → Redis |
| `Stat` | `app` | → `analytics.AnalyticsEvent` (pseudonymized) |
| `Ad` | `app` | → `transit` or dedicated ads models on `Ad` + `island` FK |
| `Group` | `app` | → `StopGroup` (ad targeting + analytics rollups) |
| `Info` | `app` | → `transit.RouteInfo.text` JSON |
| `Holiday` | `app` | → `transit.Holiday` (1:1) |
| `Variables` | `app` | → `tenancy.Island.feature_flags` + env config |
| `AIFeedback` | `app` | → `analytics.AnalyticsEvent` or archive |
| `EmailOpen` | `app` | → `analytics.AnalyticsEvent(module="comms")` or archive |
| `ReturnRoute` | `app` | **Not a DB model** — compat serialization helper only |
| `LoadRoute` | `app` | **Not a DB model** — compat serialization helper only |
| `Subscription` | **`subscriptions`** (separate app, `db_table='subscriptions'`) | → `billing.Entitlement(source="legacy_email")` |

## 2. Design decisions vs legacy

The legacy schema is **denormalized and fragile**:

- `Route.stops` is a *stringified Python dict* (`{'Stop A': '08h30', ...}`) in a JSONField — not valid JSON, parsed with `ast.literal_eval`.
- No FK between routes and stops; stop names are free strings reconciled by `cleaned_name` fuzzy match.
- `Trip`/`TripStop`/`Data` are a parallel Google-Maps-derived system with a 30-day TTL, not used for v2 search.
- Multilingual content is split across `titlePT/titleEN/...` columns (`Info`) and per-route JSON.

We normalize transit into a GTFS-inspired relational model, keep multilingual content as structured JSON, and scope everything to `Island`.

## 3. Transit module (`transit`)

```
Operator
  name            "CRP" | "AVM" | "Varela"   (legacy: route-number prefix convention)
  contact         JSON (phone, email, url)

Line                       # a bus line (legacy Route.route, e.g. "208")
  operator        FK Operator
  code            "208"
  display_name    optional human name
  disabled        bool                       (legacy Route.disabled)

Stop                       # canonical stop (legacy Stop)
  name            str
  cleaned_name    str  (lowercase, accents stripped; index (island, cleaned_name))
  latitude        float
  longitude       float
  POINT geometry  (optional PostGIS later)

Calendar                   # day-type service pattern (legacy type_of_day enum)
  service_type    "WEEKDAY" | "SATURDAY" | "SUNDAY"
  # holidays map to SUNDAY via Holiday table (legacy get_type_of_day())

Trip                       # one scheduled run of a Line on a Calendar
  line            FK Line
  calendar        FK Calendar
  headsign        optional
  direction       optional
  information      FK RouteInfo (nullable)   # multilingual notice
  likes / dislikes int                       (legacy Route.likes/dislikes)
  source          "operator" | "gmaps"       # replaces Route vs Trip split

StopTime                   # ordered stop+time on a Trip  (REPLACES stringified dict)
  trip            FK Trip
  stop            FK Stop
  sequence        int
  departure_time  Time      ("08h30" → 08:30)
  arrival_time    Time (nullable)
  unique_together (trip, sequence)

RouteInfo                  # multilingual operator notice (legacy Info + Route.information)
  text            JSON {"pt": "...", "en": "...", "es": ..., "fr": ..., "de": ...}
  source          str
  company         str
  start / end     datetime

Holiday                    # (legacy Holiday)
  date            date
  name            str

RouteFeedback              # normalized likes/dislikes audit (optional, anti-abuse)
  trip            FK Trip
  session_hash    str       # pseudonymous (see GDPR)
  vote            "like" | "dislike"
```

**Key win:** `StopTime` makes schedules queryable (`WHERE stop_id=? AND departure_time>=?`) instead of substring-matching a stringified dict.

### Legacy → new transit mapping

| Legacy | New |
|--------|-----|
| `Route.route` | `Line.code` |
| `Route.stops` (str-dict) | rows in `StopTime` (parsed) |
| `Route.cleaned_stops` | derived; dropped (use `StopTime` + `Stop.cleaned_name`) |
| `Route.type_of_day` | `Calendar.service_type` |
| `Route.information` (JSON) | `RouteInfo.text` |
| `Route.disabled` | `Line.disabled` / `Trip` filtered |
| `Route.likes/dislikes` | `Trip.likes/dislikes` |
| `Stop.{name,cleaned_name,lat,lng}` | `Stop.*` (1:1) |
| `Trip`/`TripStop`/`Data` (GMaps) | folded into `Trip(source="gmaps")` + on-demand proxy; `Data` cache → Redis, not a table |
| `Info.titleXX/messageXX` | `RouteInfo.text` JSON |
| `Holiday` | `Holiday` (1:1) |
| `Variables` (version/maps flags) | `Island.feature_flags` + app config |
| `Group` (geographic stop groups for ads/stats) | `StopGroup` (kept for ad targeting + analytics rollups) |

## 4. Accounts & consent (`user_management` + `consent`)

```
User (Django auth via boilerplate user_management / allauth)
  email, auth fields, locale, created_at
  # anonymous usage allowed; account optional except for community features

ConsentRecord
  user            FK User (nullable for anonymous)
  session_hash    str
  purposes        JSON  {"analytics": true, "ads": false, "personalization": true}
  policy_version  str
  granted_at      datetime
  withdrawn_at    datetime (nullable)
```

## 5. Analytics (`analytics`)

```
AnalyticsEvent              # universal, replaces flat Stat (see SDD 06)
  module          "transit"|"news"|"earthquakes"|"marketplace"|"trails"|"traffic"|"events"
  event_type      "search"|"filter"|"view"|"engage"|"load" ...
  properties      JSON  (module-specific payload; no PII)
  session_hash    str   (pseudonymous; see SDD 07)
  consent_state   JSON snapshot at emit time
  platform        "android"|"ios"|"web"
  locale          str
  app_version     str
  occurred_at     datetime
  # NO raw IP, NO stable user id unless consented
```

### Legacy → analytics mapping

| Legacy `Stat` field | New |
|---------------------|-----|
| `request` (`get_route`,`get_directions`,`android_load`,`find_routes`) | `module="transit"`, `event_type` mapped |
| `origin`/`destination`/`time`/`type_of_day` | `properties` JSON |
| `platform`/`language` | `platform`/`locale` |
| `timestamp` | `occurred_at` |
| `Ad.seen`/`clicked` | `AnalyticsEvent(module varies, event_type="impression"/"click")` + counters |
| `EmailOpen` | `AnalyticsEvent(module="news"/"comms")` or retired |

## 6. Billing (`billing` + boilerplate `stripe_payments`)

```
Entitlement                 # unifies Stripe + RevenueCat + legacy allow-list
  user            FK User (or email for legacy)
  tier            "free" | "premium"
  source          "stripe" | "revenuecat" | "legacy_email"
  external_id     str
  status          "active"|"trialing"|"canceled"|"expired"
  current_period_end datetime (nullable)
  features        JSON  ["ad_removal","gps_alerts","personalized_notifications"]

Promotion                   # Pay-to-Promote (marketplace/events)
  target_type     "service_provider" | "community_event"
  target_id       int
  status          "active"|"scheduled"|"expired"
  start / end     datetime
  tier            str
```

### Legacy → billing mapping

| Legacy `subscriptions.Subscription` | New `billing.Entitlement` |
|---------------------------------------|---------------------------|
| `email` | `user`/`email` |
| `is_active` | `status="active"`, `tier="premium"`, `source="legacy_email"` |
| `verification_count` | dropped (telemetry only) |
| hardcoded `features` | `features` JSON |

ETL reads `subscriptions` table via legacy DB router or explicit `legacy_subscriptions` import step ([`05`](./05-data-migration.md)).

## 7. Other modules (summarized; detail in [`09-modules.md`](./09-modules.md))

```
news/        NewsSource(name,url,rss_url,language)  NewsArticle(title,summary,url,published_at,source,categories)
seismic/     SeismicEvent(emsc_id,magnitude,depth,lat,lng,occurred_at,region)  FeltReport(event,session_hash,lat,lng,intensity)
marketplace/ ServiceCategory(name,icon)  ServiceProvider(name,category,bio,hourly_rate,phone,geo,is_promoted,rating)  Review(provider,session_hash,rating,text)
trails/      Trail(name,difficulty,length_km,geojson,source_ref)  TrailStage(...)  POI(name,type,geo)
traffic/     TrafficReport(type,lat,lng,session_hash,created_at,expires_at,confirmations,status)
events/      **Shipped:** no ORM models — Viator tours are proxied live ([`04`](./04-api-design.md) §2.4). **Planned:** CommunityEvent(title,description,start,end,venue,geo,is_promoted,status); optional ViatorListing cache table if Partner API caching policy changes
ads/         Ad(...)  StopGroup(...)   # first-party ad campaigns, migrated from legacy Ad/Group
```

`Ad` is migrated largely as-is (it already has platform/status/action/target/seen/clicked) but gains an `island` FK and integrates with the consent/ads purpose.

## 8. Indexing & integrity highlights

- All tenant tables: composite index `(island, <lookup>)`.
- `Stop`: `(island, cleaned_name)` + GIN trigram on `cleaned_name` for fuzzy search (replaces `__contains`).
- `StopTime`: `(stop, departure_time)` and `(trip, sequence)`.
- `AnalyticsEvent`: `(island, module, occurred_at)`; consider monthly partitioning given append-only high volume.
- `Entitlement`: unique `(source, external_id)`; index on `user`.
- FKs use `PROTECT` on `island`, `CASCADE` within a module where safe.
