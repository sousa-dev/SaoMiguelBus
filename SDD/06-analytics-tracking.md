# SDD 06 — Module-Wide Search Analytics & Tracking

## 1. Problem with legacy tracking

Three uncoordinated systems:
- **Server `Stat`** — one flat table, only transit events (`get_route`, `get_directions`, `android_load`, `find_routes`), params crammed into a query string `POST`.
- **Google Analytics** (`gtag`, `G-YSWK1F7F0B`) — loaded unconditionally, before any consent.
- **Umami** — self-hosted, with `data-umami-event` attributes everywhere.

No module awareness beyond transit, no consent gating, no normalization.

## 2. Target: one normalized event spine

Every meaningful interaction across **all 7 modules** emits an `AnalyticsEvent` through one ingestion endpoint (`analytics` app — `src/analytics/`). Third-party analytics (GA/Umami) become optional, consent-gated, and secondary — the first-party `AnalyticsEvent` table is the system of record. Boilerplate already documents GA event patterns in `documentation/docs/6_customization/event_tracking.md`; SMB extends that taxonomy for module events.

```
AnalyticsEvent
  island          FK (tenant)
  module          transit | news | earthquakes | marketplace | trails | traffic | events | minibus
  event_type      search | filter | view | engage | impression | click | load | submit | confirm
  properties      JSON   # normalized per (module, event_type), NO PII
  session_hash    str    # pseudonymous rolling hash (see SDD 07), NULL if no analytics consent
  consent_state   JSON   # snapshot of purposes at emit time
  platform        android | ios | web
  locale / app_version
  occurred_at
```

### Normalized property contracts (examples)

| module | event_type | properties |
|--------|-----------|------------|
| transit | search | `{origin, destination, day_type, start_time, results_count}` |
| transit | filter | `{filter: "favorites"|"operator", value}` |
| news | search | `{query, category, results_count}` |
| earthquakes | engage | `{action: "felt", event_id, intensity}` |
| marketplace | search | `{query, category, results_count}` |
| marketplace | engage | `{action: "call"|"review"|"view", provider_id}` |
| trails | view | `{trail_id, difficulty}` |
| traffic | submit | `{report_type, has_location: true}` |
| events | engage | `{action: "view"|"submit"|"promote", event_id}` — community events (**planned**) |
| tours | view / open / book_click | `{screen?, tour_code, title?}` — **shipped** Expo client uses module key `tours` (not `events`) for Viator tab ([`09`](./09-modules.md) §7) |
| minibus | search | `{origin, destination, results_count, offline, source: "api"|"offline"}` |
| minibus | engage | `{action: "select_journey"|"offline_sync"|"open_from_hub"|"open_from_transit", …}` — journey props on `select_journey`; sync phase/outcome on `offline_sync` |
| minibus | view | `{screen: "list"|"search"|"line"|"line_map"|"line_map_stop"|"live"|"directions", …}` |
| minibus | live_entry_open | `{source: "hub"|"line_detail", line?}` |
| minibus | live_filter | `{line_slug, source?: "chip"|"deep_link"|"stops_toggle"}` — `line_slug` is slug or `"all"` |
| minibus | live_toggle | `{show_stops: bool}` |
| minibus | live_select | `{source: "map"|"fleet_bar"|"vehicle_sheet", vehicle_id? \| stop_key? \| stop_sequence?}` — exactly one selection key |
| minibus | live_map_control | `{action: "center"|"zoom_in"|"zoom_out"}` |
| minibus | live_fleet_bar | `{action: "expand"|"collapse"|"clear_vehicle"}` |
| minibus | live_permission | `{outcome: "granted"|"denied"}` |
| minibus | live_health | `{action: "retry"}` |
| minibus | live_navigate | `{action: "view_line", line_slug, source: "stop_sheet"}` |

Property schemas are validated server-side (a registry per module/event_type) to keep the table analyzable. **Shipped (v1):** `minibus` only — see `SaoMiguelBus-api/src/analytics/event_registry/minibus.py`. Other modules pass through unchanged until registered. Expo live helpers: `SaoMiguelBus/features/minibus/lib/live-analytics.ts`.

## 3. Ingestion

```
POST /api/v3/analytics/events
  body: { events: [ {module, event_type, properties, occurred_at}, ... ] }
  headers: X-Island, (optional) auth
```

- **Client batches** events and flushes periodically / on background — efficient and offline-friendly.
- Server **derives** `session_hash`, `consent_state`, `platform`, `locale`, `app_version`; client never sends IP/user id.
- If the session has **no analytics consent**, the server stores an aggregate-only counter (or drops row-level), never `session_hash`. See [`07`](./07-gdpr-data-governance.md).
- Legacy `POST /api/v1/stat?...` is translated into this by the compat shim.

## 4. Client SDK contract (Expo)

A thin `track(module, eventType, properties)` helper:
- No-ops for purposes the user hasn't consented to.
- Buffers in memory + AsyncStorage, flushes in batches.
- Strips anything that looks like PII before sending (defense in depth).
- Mirrors to GA/Umami **only** if the corresponding consent purpose is granted.

## 5. Reporting

- Admin dashboards query `AnalyticsEvent` with `(island, module, occurred_at)` filters.
- Rollups (top origins/destinations, loads by language, group impressions — the legacy `/statistics` dashboard equivalents) become materialized/aggregate queries, computed by Celery into summary tables so raw rows can be deleted on retention without losing trends.
- Ad impression/click analytics (legacy `Ad.seen/clicked`, `/stats/group`) map to `module-scoped` impression/click events + counters.

## 6. Migration

Historical `Stat` rows → `AnalyticsEvent` (see [`05-data-migration.md`](./05-data-migration.md) §4). Aggregate summaries computed for pre-retention history so dashboards keep continuity after raw rows age out.
