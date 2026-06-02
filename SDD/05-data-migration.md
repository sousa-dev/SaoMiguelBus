# SDD 05 — Data Migration Strategy (2020+)

Goal: migrate **all** historical data from the legacy DB into the new tenant-scoped schema without data loss, parsing fragile legacy formats, and pseudonymizing analytics in flight.

Implementation: idempotent Django management commands in `src/tenancy/management/commands/` (and per-app commands), orchestrated by **`import_legacy`**.

## 1. Sources (concrete paths)

| Source | Path | Contents |
|--------|------|----------|
| Legacy production Postgres | `DATABASE_URL` dump / read replica | Full history: `Route`, `Stop`, `Stat`, `Ad`, `Group`, `Info`, `Holiday`, `Variables`, `AIFeedback`, `EmailOpen`, likes/dislikes |
| Legacy dev SQLite | `legacy/src/db.sqlite3` | Same schema; pre-seeded routes/stops for local ETL dev |
| Fixture dump | `legacy/src/data.json` | ~2022 cross-check / earliest seed |
| Operator timetables | `legacy/scripts/csv/*.csv` | `stops.csv`, `crp_routes.csv`, `avm_routes.csv`, `varela_routes.csv` |
| Geographic groups | `legacy/scripts/groups.json` | Stop groups for ads/stats |
| Processed outputs | `legacy/scripts/out/*.csv` | Optional fallback if DB parse fails |
| Subscriptions | `legacy` DB table `subscriptions` | Separate Django app — not in `app_*` tables |

**Dev vs prod:** legacy dev uses SQLite (`legacy/src/db.sqlite3`); production uses Postgres (`dj_database_url` + `DATABASE_URL`). The importer accepts `--database-url` or reads from a mounted legacy SQLite file.

## 2. The hard part: `Route.stops`

Legacy stores schedules as a **stringified Python dict**, e.g.:

```python
"{'Ponta Delgada': '08h30', 'Lagoa': '08h45', 'Vila Franca': '09h10'}"
```

ETL (`transit/services/legacy_import.py`):

1. Parse with `ast.literal_eval` (never `json.loads`).
2. Normalize times `"08h30"` → `time(8, 30)`.
3. For each `(stop_name, time)` create `StopTime` with `sequence` from dict insertion order.
4. Resolve `stop_name` → `Stop` FK via exact match, else `cleaned_name` trigram; backfill coords from `TripStop` / `groups.json` / `stops.csv`; log unmatched for manual review.
5. Create `Line` from `Route.route`, `Calendar` from `type_of_day`, `Trip` linking them, `RouteInfo` from `Route.information`.

## 3. Import commands (djast pattern)

Follow boilerplate conventions: logic in `services.py`, thin `management/commands/`, type hints, Google-style docstrings, idempotent upserts.

### Orchestrator

```bash
cd SaoMiguelBus-api/src

# Full import (dependency order, writes migration report)
python manage.py import_legacy \
  --legacy-db sqlite:///../legacy/src/db.sqlite3 \
  --island sao-miguel

# Dry-run
python manage.py import_legacy --dry-run

# Single step (re-runnable)
python manage.py migrate_legacy stops
```

### Step commands (`migrate_legacy <step>`)

| Step | Command | Target models |
|------|---------|---------------|
| 1 | `migrate_legacy islands` | `tenancy.Island` from legacy constants + `Variables` |
| 2 | `migrate_legacy operators` | `transit.Operator` from line prefixes (CRP/AVM/Varela) |
| 3 | `migrate_legacy stops` | `transit.Stop` (+ CSV backfill) |
| 4 | `migrate_legacy stop_groups` | `StopGroup` from `Group` / `groups.json` |
| 5 | `migrate_legacy calendars` | `transit.Calendar` (WEEKDAY/SATURDAY/SUNDAY) |
| 6 | `migrate_legacy holidays` | `transit.Holiday` |
| 7 | `migrate_legacy lines_trips` | `Line`, `Trip`, `StopTime` — parse `Route.stops` |
| 8 | `migrate_legacy route_info` | `RouteInfo` from `Info` + `Route.information` |
| 9 | `migrate_legacy ads` | `Ad` (+ `island` FK) |
| 10 | `migrate_legacy votes` | `Trip.likes/dislikes` counters |
| 11 | `migrate_legacy subscriptions` | `billing.Entitlement` from `subscriptions.Subscription` |
| 12 | `migrate_legacy analytics` | `analytics.AnalyticsEvent` from `Stat` |

Each command:

- **Idempotent** — upsert by natural key + `legacy_ref` JSON (`{"table": "app_route", "id": 123}`).
- Writes **`migration_reports/<step>_<timestamp>.json`** (counts in/out, errors, unmatched stops).
- Uses `tenancy.for_island(island)` for all writes.

### Easy one-shot workflow (new empty DB)

```bash
# 1. Promote boilerplate + run migrations on new backend
cd SaoMiguelBus-api && python setup.py
cd src && python manage.py migrate

# 2. Import everything from legacy SQLite (dev) or Postgres URL (prod)
python manage.py import_legacy --legacy-db sqlite:///$(pwd)/../legacy/src/db.sqlite3

# 3. Validate parity (see §5)
python manage.py validate_legacy_parity --sample-size 100
```

### Connecting to legacy Postgres (production)

```bash
export LEGACY_DATABASE_URL=postgres://readonly:...@host:5432/saomiguelbus
python manage.py import_legacy --legacy-db "$LEGACY_DATABASE_URL"
```

Importer uses a secondary DB router (`legacy` alias in settings) or raw SQLAlchemy/psycopg2 read-only connection — **never** writes to legacy.

### Production JSON export → batched import (large datasets)

When direct Postgres access is unavailable or the export is too large for a single in-memory parse (~400MB+, ~1.7M `app_stat` rows):

**Export (legacy API on `main-temp` branch):**

```bash
# Batched export with checkpoint/resume (scripts/pull_legacy_export.py on operator machine)
python3 scripts/pull_legacy_export.py \
  --base-url https://api.saomiguelbus.com \
  --key "$AUTH_KEY" \
  --output final_smb_legacy_export.json \
  --essential-only          # skips app_data (GMaps cache) — safe to omit

# Or async job API:
curl 'https://api.saomiguelbus.com/api/v1/export/legacy?key=$AUTH_KEY'
curl 'https://api.saomiguelbus.com/api/v1/export/legacy/status?key=$AUTH_KEY&job_id=JOB_ID'
curl -o export.json 'https://api.saomiguelbus.com/api/v1/export/legacy/download?key=$AUTH_KEY&job_id=JOB_ID'
```

**Split + async import (revamp backend):**

```bash
python3 scripts/split_legacy_export.py \
  --input final_smb_legacy_export.json \
  --output-dir smb_export_batches \
  --batch-size 5000

python manage.py import_legacy \
  --export-dir media/legacy_imports/smb_export_batches \
  --essential-only \
  --async

# Monitor: Django admin → Legacy import jobs
# Cancel stale Celery: POST /api/v1/ops/celery/cancel-all?key=$AUTH_KEY
```

`LegacyBatchedExportSource` streams JSONL batches from a directory with `manifest.json` — avoids worker OOM. `LegacyImportJob` tracks progress via Celery.

**Import mapping (essential tables):**

| Export table | Target |
|---|---|
| `app_stop`, `app_route`, … | `transit.*` (Stop, Trip, Line, …) |
| `app_stat` | `analytics.Stat` |
| `subscriptions` | `billing.Subscription` |
| `app_data`, `app_trip`, … | `legacy_archive` (optional; skip with `--essential-only`) |

## 4. Analytics migration with pseudonymization

`Stat` is high-volume, append-only, mostly anonymous (no user/session id in legacy).

- `request` → `module`/`event_type`; dimensions → `properties` JSON.
- `session_hash = NULL` / `"legacy"` marker (sessions not reconstructable).
- Rows beyond retention window → aggregate-only or skip row-level detail ([`07`](./07-gdpr-data-governance.md)).
- `consent_state = {"migrated": true}` for pre-CMP history.

`AIFeedback` / `EmailOpen`: migrate to `AnalyticsEvent` if useful, else export to cold storage JSON under `migration_reports/archive/`.

## 5. Validation (parity gate)

Before cutover:

1. **Search parity:** sample `(origin, destination, day, start)` — compare `transit.services.search_routes()` vs compat `/api/v2/route` vs legacy DB responses.
2. **Bootstrap parity:** diff compat `/api/v2/webapp/load` vs legacy production payload.
3. **Counts:** reconciliation table in migration report — every legacy row migrated / dropped / flagged.
4. **Unmatched stops:** empty or manually resolved.

`validate_legacy_parity` management command automates (1)-(3) and exits non-zero on regression.

## 6. Cutover (strangler-fig, reversible)

**Current stage:** **B → C** — compat validated on staging; production DNS cutover pending.

```
Stage A  ETL into new DB from legacy snapshot; legacy still serves live traffic.     ← done (batched import)
Stage B  compat on new backend; shadow/canary parity checks.                         ← in progress
Stage C  Point api.saomiguelbus.com to revamp (compat); legacy hot fallback.         ← next
Stage D  Clients move to /api/v3 module-by-module.
Stage E  Decommission legacy when compat usage → 0.
```

**Rollback:** repoint DNS/env to `legacy/` through Stage C.

## 7. Ongoing sync during dual-run

Compat shim writes analytics/likes to **new** DB as system of record; one-way reconcile job for any writes still landing on legacy until full cutover.

## 8. Data we deliberately drop or fold

| Legacy | Disposition |
|--------|-------------|
| `Data` (GMaps JSON cache) | Not migrated → Redis |
| `Route.cleaned_stops` | Recomputed from `StopTime` |
| `Variables` | `Island.feature_flags` |
| `Subscription.verification_count` | Dropped |
| `Trip`/`TripStop` GMaps rows (30-day TTL) | Not bulk-migrated |
| `api/other/fix/stops` | Not applicable — maintenance only |
