# SDD 05 — Data Migration Strategy (2020+)

Goal: migrate **all** historical data from the legacy Postgres DB into the new tenant-scoped schema without data loss, parsing the fragile legacy formats, and pseudonymizing analytics in flight.

## 1. Sources

| Source | Contents |
|--------|----------|
| Legacy production Postgres | `Route`, `Stop`, `Trip`/`TripStop`/`Data`, `Stat`, `Ad`, `Group`, `Info`, `Holiday`, `Variables`, `Subscription`, `AIFeedback`, `EmailOpen`, likes/dislikes |
| `SaoMiguelBus-api/src/data.json` | ~2022 fixture dump (cross-check / earliest seed) |
| `scripts/data/*.txt`, `scripts/csv/*.csv`, `scripts/groups.json` | original operator timetables + geographic groups (source-of-truth fallback) |

## 2. The hard part: `Route.stops`

Legacy stores schedules as a **stringified Python dict**, e.g.:

```python
"{'Ponta Delgada': '08h30', 'Lagoa': '08h45', 'Vila Franca': '09h10'}"
```

This is **not JSON** (single quotes, `HhMM` time format). The ETL must:

1. Parse with `ast.literal_eval` (never `json.loads`).
2. Normalize times `"08h30"` → `time(8, 30)`.
3. For each `(stop_name, time)` create a `StopTime` with `sequence` from dict insertion order.
4. Resolve `stop_name` → `Stop` FK via exact match, else `cleaned_name` (accent-stripped, lowercased) trigram match; unmatched names are logged and either auto-created as a `Stop` (if coordinates available from `Stop`/`TripStop`/groups) or flagged for manual review.
5. Create `Line` from `Route.route`, `Calendar` from `type_of_day`, `Trip` linking them, and `RouteInfo` from `Route.information`.

## 3. ETL pipeline

Implemented as idempotent Django management commands (`migrate_legacy <model>`), run in dependency order:

```
1. islands         → create Island(key="sao-miguel", center/radius/timezone/theme from legacy constants)
2. operators       → derive from Line code prefixes (CRP=1*, AVM=2*, Varela=3*) + scripts metadata
3. stops           → Stop (1:1) ; backfill missing from TripStop + groups.json
4. stop_groups     → Group → StopGroup
5. calendars       → 3 fixed rows (WEEKDAY/SATURDAY/SUNDAY)
6. holidays        → Holiday (1:1)
7. lines+trips+stoptimes → parse Route.stops dicts (the hard part, §2)
8. route_info      → Info + Route.information → RouteInfo
9. ads             → Ad (+island) ; preserve seen/clicked
10. feedback votes → Route/Trip likes/dislikes → Trip counters
11. subscriptions  → Subscription → Entitlement(source="legacy_email")
12. analytics      → Stat → AnalyticsEvent (pseudonymized, §4)
```

Each command:
- Is **idempotent** (re-runnable; upserts by natural key).
- Writes a **migration report** (counts in/out, unmatched stops, parse failures).
- Tags rows with `legacy_id` (kept in a `legacy_ref` JSON/column) for traceability and dual-read validation.

## 4. Analytics migration with pseudonymization

`Stat` is high-volume, append-only, and already mostly anonymous (no user/session id). On migration:

- `request` → `module`/`event_type`; `origin/destination/time/type_of_day` → `properties`.
- No IP exists in legacy `Stat`, so nothing to scrub there; we still assign a **synthetic `session_hash = NULL`/`"legacy"`** marker (we cannot reconstruct sessions).
- Historical events older than the retention window ([`07`](./07-gdpr-data-governance.md)) are migrated **already-anonymized** (aggregated counts retained, row-level detail dropped if beyond retention) to start compliant.
- `consent_state` for legacy rows = `{"migrated": true}` (pre-CMP; treated as aggregate analytics only).

## 5. Validation (parity gate)

Before cutover, prove equivalence:

1. **Search parity:** for a sampled matrix of `(origin, destination, day, start)`, compare new `/transit/search` (and compat `/api/v2/route`) against recorded legacy responses; require identical result sets.
2. **Bootstrap parity:** diff new `/api/v2/webapp/load` (compat) vs legacy production payload (stops list, holidays, infos, routes count).
3. **Counts:** every legacy row accounted for (migrated / intentionally-dropped / flagged), reconciled in the migration report.
4. **Spot-check unmatched stops** list is empty or manually resolved.

## 6. Cutover (strangler-fig, reversible)

```
Stage A  Dual-run: new backend reads from a replica/snapshot of legacy data via ETL.
         Legacy stack still serves all live traffic.
Stage B  Flip compat shim to new backend for read endpoints behind Island.is_live.
         Validate parity in production (shadow traffic / canary).
Stage C  Point clients' API base URL to new backend (compat shim). Legacy serves as hot fallback.
Stage D  Migrate clients to /api/v3 module-by-module; watch Deprecation header usage.
Stage E  Decommission legacy once compat usage → 0.
```

**Rollback:** at A–C, repoint to legacy (still deployed). After D, legacy remains a fallback until E.

## 7. Ongoing sync during dual-run

For the window where both stacks accept writes (mainly `/stat` and likes), the compat shim writes to the **new** DB as the system of record; a one-way backfill job reconciles any writes that still landed on legacy until clients are fully cut over.

## 8. Data we deliberately drop or fold

| Legacy | Disposition |
|--------|-------------|
| `Data` (raw GMaps JSON cache table) | Not migrated; replaced by Redis cache |
| `Route.cleaned_stops` | Recomputed from `StopTime` |
| `Variables` | Folded into `Island.feature_flags` |
| `Subscription.verification_count` | Dropped (telemetry only) |
| `AIFeedback`, `EmailOpen` | Migrated to `AnalyticsEvent` if still useful, else archived to cold storage |
| `Trip`/`TripStop` 30-day GMaps rows | Not migrated (ephemeral by design) |
