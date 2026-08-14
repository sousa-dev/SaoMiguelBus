---
title: "feat: AzoresBus changeover — API backend plan"
status: draft
date: 2026-08-13
type: feat
target_repo: SaoMiguelBus-api
---

# Backend plan — `SaoMiguelBus-api`

All paths relative to `SaoMiguelBus-api/src/`. Read
[01-upstream-api-reference.md](01-upstream-api-reference.md) first — the sync design
follows directly from the measured upstream behaviour.

---

## 1. What already fits

The existing schema is closer to this problem than expected:

| Existing | Fit |
|----------|-----|
| `transit.Calendar` with exactly `WEEKDAY`/`SATURDAY`/`SUNDAY` | **Exact match** for upstream's three patterns |
| `search.get_type_of_day()` mapping holidays → `SUNDAY` | **Exact match** for upstream's holiday behaviour |
| `Island.feature_flags` JSON + bootstrap serialization | Flag transport, already plumbed to the app |
| `MinibusImportMeta` (`source_url`, `source_revision`, `imported_at`, `tariffs_effective_date`) | Template for import metadata, reuse the shape |
| `minibus/tracking_client.py` + `services_tracking.py` | Cache/lock/stale-grace tracking layer to mirror |
| `offline_bundle.py` `data_revision` + version fingerprint | Staleness signalling, extend rather than replace |
| `MinibusLine.route_shapes` JSON | Precedent for storing encoded polylines |

So the work is mostly **additive**. Three things genuinely need designing: the dataset
tag, the sync worker, and the stop-identity mapping.

---

## 2. New Django app: `azoresbus`

Keep the sync/tariffs/tracking concerns in their own app rather than swelling `transit`.
The *schedule data itself* still lands in `transit` models so search, offline bundle,
directions and trip detail work unchanged.

```
src/azoresbus/
  __init__.py  apps.py  admin.py
  models.py                 # ExternalStop, ExternalJourney, TariffSnapshot, SyncRun
  client.py                 # rate-limited HTTP client for azb.elevensystems.pt
  tariffs_client.py         # azoresbus.pt/static/json/tariffs.json
  services_sync.py          # upstream → transit.* models
  services_tariffs.py       # tariffs snapshot → parsed payload
  services_tracking.py      # mirrors minibus/services_tracking.py
  tracking_client.py        # mirrors minibus/tracking_client.py
  api_v3.py  urls_v3.py  throttling.py
  tasks.py                  # celery: sync_schedules, sync_tariffs
  management/commands/sync_azoresbus.py
  migrations/
  tests/
```

---

## 3. Schema changes

### 3.1 The `dataset` tag

```python
# transit/models.py
DATASET_LEGACY = 'legacy'
DATASET_AZORESBUS = 'azoresbus'
DATASET_CHOICES = [(DATASET_LEGACY, 'Legacy network'), (DATASET_AZORESBUS, 'AzoresBus 2026')]
```

Added to **`Stop`**, **`Line`**, **`Trip`** as
`models.CharField(max_length=16, choices=DATASET_CHOICES, default=DATASET_LEGACY, db_index=True)`.

`Trip.dataset` is denormalised from its `Line` — worth it, because search filters on
`Trip` and the extra join is on the hot path.

**Uniqueness changes** (this is the backwards-compatibility crux):

```python
# Line:  ('island', 'code')          → ('island', 'dataset', 'code')
# Stop:  add index ('island', 'dataset', 'cleaned_name')
```

Line codes collide across datasets — legacy already has routes numbered in the 100s.
Without `dataset` in the key the migration fails on real data.

Migration steps:
1. `AddField` with `default='legacy'` — every existing row is correctly tagged by the default.
2. `AlterUniqueTogether` / `AddIndex`.
3. No data migration needed. This is the payoff for choosing `legacy` as the default.

### 3.2 Stop identity — the real modelling problem

Upstream has **1456 stops but only 816 distinct names** ([01 §2](01-upstream-api-reference.md)).
The duplicates are the two sides of a road, and the measurements are unambiguous:

| Measure | Value |
|---------|-------|
| Distinct names | 816 (181 singletons, 630 pairs, 5 triples) |
| Median separation within a name | **12 m** |
| Mean / max separation | 17 m / **164 m** |
| Groups > 100 m apart | **3** |
| Pairs with consecutive integer codes (`1001`/`1002`) | **629 of 630** |

And the pairs are **direction-selected**. Sampling both directions of route 101: of the
27 names served both ways, **24 use a different code in each direction**. Route 102:
10 of 14. The upstream data already tells us which pole a given trip serves — it is in
`circulations[].stage.id`.

> **So the user never has to choose a side.** Which pole you board at is a property of
> the *trip*, derived from its direction. It is not a search input. This is the whole
> justification for collapsing.

**Approach:** collapse to one `transit.Stop` per distinct `(dataset, cleaned_name)`,
positioned at the **centroid** of its members, and keep full upstream identity in a
side table:

```python
class ExternalStop(TenantScopedModel):
    dataset      = models.CharField(max_length=16, default='azoresbus')
    external_id  = models.CharField(max_length=32)      # stage.id, e.g. "181"
    code         = models.CharField(max_length=32)      # nameShort, e.g. "1002"
    name         = models.CharField(max_length=200)     # verbatim upstream
    latitude     = models.FloatField()
    longitude    = models.FloatField()
    stop         = models.ForeignKey('transit.Stop', on_delete=models.CASCADE,
                                     related_name='external_stops')

    class Meta:
        unique_together = [('island', 'dataset', 'external_id')]
```

**`StopTime` must also carry the pole**, or collapsing silently destroys the
information we just established is available:

```python
# transit/models.py — StopTime
external_stop = models.ForeignKey('azoresbus.ExternalStop', null=True, blank=True,
                                  on_delete=models.SET_NULL, related_name='stop_times')
```

Nullable, so every legacy row is valid unchanged. Without this field we could not draw
the boarding marker on the correct side of the road, and could not resolve a live
vehicle's `currentStopSequence` to a physical stop — both of which the data supports.

So: **search and pickers use the 816 collapsed `Stop` rows; rendering uses
`StopTime.external_stop`.**

Sanity check during import: flag any collapsed name whose members span **> 75 m** for
review (30 groups today, worst 164 m). An earlier draft of this plan said 250 m — that
threshold would never fire, since nothing in the dataset exceeds 164 m.

### 3.3 Repeated stop names within a journey — breaks the existing search

**This is the sharpest edge in the whole changeover.** Scanning all 50 routes with
weekday service, **13 routes revisit the same stop name within a single journey**:

| Route | Repeated names | Journey length |
|-------|----------------|----------------|
| 335 | **37** | 97 stops |
| 301, 303, N01 | 14 | 59 / 59 / 68 |
| 306 | 9 | 43 |
| N03, N05, 323, 105 | 2–3 | 17–54 |
| 108, 110, 202, 312 | 1 | 27–75 |

Five routes (`301`, `303`, `306`, `323`, `N03`) are **loops** whose first and last stop
share a name, and ten routes are single-direction.

Both current search implementations resolve stops by **first occurrence**:

```python
# transit/services/search.py:106
if stops_str.find(origin) > stops_str.find(destination):
    continue
```
```ts
// lib/offline-bundle.ts:218
const originIndex = stopKeys.indexOf(originKey);
```

On a loop `A → B → C → D → A`, a search for `C → A` finds `A` at index 0, concludes
origin comes after destination, and **discards a perfectly valid trip**. On route 335,
with 37 repeated names, this misfires constantly.

This is a **pre-existing** bug shape, but the legacy network barely triggered it while
the AzoresBus network triggers it on a quarter of routes.

**Fix — match on sequence, not on string position.** Replace the blob-substring approach
with a query over `StopTime`:

```python
def _valid_pairs(trip, origin_stop_id, destination_stop_id):
    """All (board, alight) pairs on this trip where board precedes alight."""
    times = trip.stop_times.order_by('sequence')
    origins = [st for st in times if st.stop_id == origin_stop_id]
    dests   = [st for st in times if st.stop_id == destination_stop_id]
    return [(o, d) for o in origins for d in dests if o.sequence < d.sequence]
```

Take the pair with the **earliest departure at or after the requested start time**, and
the **shortest ride** among ties. On a loop this correctly returns "board at sequence 40,
alight at sequence 59" instead of rejecting the trip.

The offline client needs the identical rule — see [03 §5](03-mobile-plan.md).

Two bonuses from doing it this way: it drops the `clean_string` blob building from the
hot loop (currently rebuilt per trip, per search), and it makes `origin`/`destination`
resolve by stop **id** rather than by fuzzy name substring, which removes a class of
mis-hits like `ACHADA` matching `ACHADINHA`.

**Test this against route 335 specifically.** It is the worst case in the network.

### 3.4 Journey identity

```python
class ExternalJourney(TenantScopedModel):
    dataset      = models.CharField(max_length=16, default='azoresbus')
    external_id  = models.CharField(max_length=32)      # globally unique upstream
    route_ext_id = models.CharField(max_length=32)
    direction    = models.PositiveSmallIntegerField()
    shape        = models.TextField(blank=True, default='')   # encoded polyline
    payload_hash = models.CharField(max_length=64)            # skip unchanged detail fetches
    trip         = models.ForeignKey('transit.Trip', on_delete=models.CASCADE)

    class Meta:
        unique_together = [('island', 'dataset', 'external_id')]
```

`payload_hash` is what keeps re-syncs cheap: hash the journey-detail JSON, and skip the
rebuild when it has not moved.

### 3.5 Sync bookkeeping

```python
class SyncRun(TenantScopedModel):
    KIND_SCHEDULES = 'schedules'; KIND_TARIFFS = 'tariffs'
    kind        = models.CharField(max_length=16)
    status      = models.CharField(max_length=16)   # running|completed|failed|partial
    started_at  = models.DateTimeField(default=timezone.now)
    finished_at = models.DateTimeField(null=True, blank=True)
    request_count = models.PositiveIntegerField(default=0)
    stats       = models.JSONField(default=dict)    # created/updated/skipped per entity
    error       = models.TextField(blank=True)
```

Surfaced in admin, and it is what the staleness alert reads.

---

## 4. The sync worker

### 4.1 Algorithm

```
1  GET /api/stops                                    →  1 request
2  GET /api/routes?active=true&passengerInfo=true    →  1 request
3  for each of 55 routes:
       GET /api/routes/{id}                          →  55   (shape + stop set)
4  resolve three canonical dates AFTER the cutover:
       next Wednesday, next Saturday, next Sunday
   for each route × date:
       GET /api/routes/{id}/journeys?day={date}      →  165
5  for each unique journey id not matching a stored payload_hash:
       GET /api/routes/{r}/journeys/{j}              →  ≤895
6  upsert transit.{Stop,Line,Trip,StopTime} under dataset='azoresbus'
7  prune trips/lines absent from this run
8  bump_data_revision() once, prewarm_offline_bundle()
```

~**1117 requests**, ~7 min at 0.35 s pacing (measured: 165 requests in 59 s at 0.25 s —
[01 §9](01-upstream-api-reference.md)).

**Canonical dates must be after the cutover** so we capture the new network. Compute
them relative to `max(today, cutover_date)`, never hardcode.

### 4.2 Time conversion

`departureTime`/`arrivalTime` are **seconds since midnight** and can exceed 86400 for
past-midnight journeys (the `N0x` night routes are the ones to watch). `StopTime` uses
`models.TimeField`, which cannot hold 25:10.

```python
def to_time(seconds: int) -> tuple[datetime.time, int]:
    """Return (wall clock, day_offset)."""
    days, rem = divmod(int(seconds), 86400)
    return datetime.time(rem // 3600, (rem % 3600) // 60, rem % 60), days
```

Add `StopTime.day_offset = PositiveSmallIntegerField(default=0)`. Legacy rows default
to 0 and are unaffected. **Verify against the `N0x` routes during build** — if none
actually cross midnight this stays a no-op safeguard, but silently truncating 25:10 to
01:10 would reorder a trip's stops and corrupt search.

### 4.3 Rate limiting

In `azoresbus/client.py`:

- **Serial only.** No concurrency. One in-flight request.
- **Base delay** `AZORESBUS_SYNC_DELAY` (default `0.35`), plus ±20 % jitter.
- **Backoff** on `429`/`5xx`: `2 ** attempt` seconds, 4 attempts max, honouring
  `Retry-After` when present. Abort the run after 10 consecutive failures.
- **Timeout** `AZORESBUS_SYNC_TIMEOUT` (default `20`).
- **Identify ourselves.** `User-Agent: SaoMiguelBus/3.x (+https://saomiguelbus.com; contact@…)`.
  Cheap, and it makes us allowlistable rather than anonymous.
- **Budget cap** `AZORESBUS_SYNC_MAX_REQUESTS` (default `2000`) — a hard stop so a
  pagination bug cannot hammer them.
- **Resumable.** Checkpoint progress in `SyncRun.stats`; `--resume` picks up after a
  partial failure instead of refetching 1000 URLs.

### 4.4 Scheduling

**Weekly cron as primary**, per the requirement, via the established
`django_celery_beat` + migration pattern (see
`minibus/migrations/0006_periodic_task_harvest_route_shapes.py`):

```python
# azoresbus/migrations/0002_periodic_tasks.py
'azoresbus.sync_schedules'  → crontab(hour=3, minute=30, day_of_week=0)   # Sunday 03:30
'azoresbus.sync_tariffs'    → crontab(hour=4, minute=0)                   # daily, it is 1 request
```

Tariffs are a single 32 KB request with `ETag`/`Last-Modified` — run it daily
conditionally; it costs nothing when unchanged.

**Plus a lazy staleness backstop, not instead of it.** The requirement offers cron *or*
lazy; take cron for predictable load and add a cheap guard so a wedged worker cannot
serve month-old data:

```python
# in the search path — non-blocking, never delays a response
if last_successful_sync_age() > timedelta(days=SYNC_STALE_DAYS):   # default 10
    sync_schedules_task.apply_async(countdown=0)   # idempotent, lock-guarded
```

Guard with a Redis lock (`azoresbus:sync:lock`, TTL 30 min) so concurrent searches
enqueue exactly one run.

**Raise the cadence for late August.** Upstream will keep correcting the September data
until it goes live. Run **daily from ~20 August to ~15 September**, then back to weekly
— a scheduled change to the beat entry, or just a temporary second entry.

### 4.5 Management command

```bash
python manage.py sync_azoresbus [--island sao-miguel] [--dry-run] [--force]
                                [--only stops|routes|journeys|tariffs] [--resume]
                                [--delay 0.35] [--max-requests 2000]
```

`--dry-run` reports the diff without writing — the thing you actually want on the
morning of 1 September.

### 4.6 Transactionality

Wrap the upsert in `transaction.atomic()` and `suppress_revision_bumps()`
(`transit/services/offline_bundle.py`) so 895 trip writes do not each bump the
revision; issue one `bump_data_revision()` at the end. This pattern already exists for
the legacy import — follow it exactly.

Never delete-then-recreate: a failed sync would leave the app with no timetables. Upsert,
then prune what this run did not see, inside the same transaction.

---

## 5. Gateway

Reuse the **existing Tailscale Pi proxy** built for PDL Mini Bus
(`src/minibus/docs/tailscale-tracking-proxy.md`). Cloudflare already blocks Hetzner
egress on `pdl.elevensystems.pt`; assume the same for `azb.elevensystems.pt` even though
it answers from a dev machine today.

The Pi currently forwards `/publicapi/* → pdl.elevensystems.pt/publicapi/*`. It needs a
second mapping — note the **different path prefix**:

```
/azb/*  →  https://azb.elevensystems.pt/api/*
```

New env vars, mirroring the minibus naming:

```env
AZORESBUS_API_BASE_URL=http://100.x.y.z:8080/azb      # Pi proxy; direct URL as fallback
AZORESBUS_TRACKING_BASE_URL=http://100.x.y.z:8080/azb # same host, separate knob
AZORESBUS_PROXY_KEY=<same secret as MINIBUS_TRACKING_PROXY_KEY>
AZORESBUS_SYNC_DELAY=0.35
AZORESBUS_SYNC_TIMEOUT=20
AZORESBUS_SYNC_MAX_REQUESTS=2000
AZORESBUS_TRACKING_CACHE_TTL=10
AZORESBUS_TRACKING_STALE_GRACE=60
```

Keep sync and tracking on separate base-URL vars: they have very different traffic
shapes (a 7-minute weekly burst vs. 10-second polling) and you will want to point them
at different egress independently.

Sending `X-Tracking-Proxy-Key` is handled the same way as
`minibus/tracking_client.py:_tracking_headers()`.

---

## 6. Tariffs and the public pricing page

### Storage — keep it schemaless

`fareUnits` values are human-readable band labels (`"0 a 5"`, `"6 a 7"`, `"8"`), and the
category/group/tariff nesting is the operator's editorial structure, which will change
without warning ([01 §7](01-upstream-api-reference.md)). Parsing that into relational
tables buys nothing and breaks on the first restructure.

```python
class TariffSnapshot(TenantScopedModel):
    source_url     = models.URLField(max_length=255)
    effective_date = models.DateField()          # payload "date" — the "data em vigor"
    upstream_etag  = models.CharField(max_length=128, blank=True, default='')
    upstream_modified_at = models.DateTimeField(null=True, blank=True)  # Last-Modified
    fetched_at     = models.DateTimeField(default=timezone.now)
    payload        = models.JSONField()          # verbatim upstream
    content_hash   = models.CharField(max_length=64, db_index=True)
    is_current     = models.BooleanField(default=True)

    class Meta:
        ordering = ['-effective_date', '-fetched_at']
```

Snapshots are **append-only** — one row per distinct `content_hash`. That gives fare
history for free, and lets the app show "prices updated on X".

Both freshness signals the requirement asks for are real upstream data, not invented:
`effective_date` from the payload's `date` field, `upstream_modified_at` from the
`Last-Modified` header.

### Endpoint

```
GET /api/v3/transit/tariffs
```

```jsonc
{
  "effectiveDate": "2026-09-01",
  "lastUpdatedAt": "2026-08-05T13:47:25Z",
  "fetchedAt": "2026-08-13T04:00:11Z",
  "isFuture": true,                    // effectiveDate > today
  "notes": "A aquisição do cartão do passe terá um custo de 6€.\n…",
  "categories": [
    { "name": "Passes Mensais",
      "tariffs": [
        { "name": "Mensal", "note": "…", "fareUnitType": "km",
          "prices": [ { "band": "0 a 5", "price": 31.75 } ] },
        { "name": "Ex-Combatente", "note": "…",
          "prices": [ { "price": 0.0 } ] } ] } ]
}
```

Flatten the redundant `groups` level (every category has exactly one group today) but
**tolerate more than one** in the serializer — merge them rather than assuming index 0.

Cache in Redis for 6 h keyed on `content_hash`.

### The page itself

Server-rendered public page at `/precos` (pt) / `/prices` (en), in the existing
`legal`/`landing_page` template style, reading the same serializer. This satisfies "a new
public pricing page" for web/SEO; the in-app screen is in
[03-mobile-plan.md](03-mobile-plan.md) §6.

---

## 7. Search, bootstrap, and the offline bundle

### 7.1 Date-resolved search

```python
# transit/services/schedule_phase.py  (new)
def resolve_dataset(island, *, requested: str | None, on_date: date) -> str:
    """Explicit request wins; otherwise the date decides."""
    if requested in (DATASET_LEGACY, DATASET_AZORESBUS):
        return requested
    return DATASET_AZORESBUS if on_date >= cutover_date(island) else DATASET_LEGACY

def schedule_phase(island, on_date) -> str:      # preview | live | settled
    ...
```

`cutover_date` / `banner_until` live in `Island.feature_flags`:

```jsonc
"azoresbus": {
  "cutoverDate":  "2026-09-01",
  "bannerUntil":  "2026-10-01",
  "previewEnabled": true,
  "trackingEnabled": false
}
```

Editable in admin — no deploy to change the date.

Then in `search_routes()` (`transit/services/search.py:92`), add one filter:

```python
Trip.objects.filter(source=Trip.SOURCE_OPERATOR, line__disabled=False, dataset=dataset)
```

`transit_search_view` reads `?dataset=` and passes it through `resolve_dataset()`.
`transit_stops_view` gets the same treatment.

**Regression to guard:** an existing client sending no `dataset` must get *exactly*
today's behaviour before the cutover. Write that test first.

`search_routes()` also swaps first-occurrence string matching for sequence-based pair
selection ([§3.3](#33-repeated-stop-names-within-a-journey-breaks-the-existing-search)) —
required for the 13 routes that revisit a stop name.

### 7.1b Boarding-pole data in the search response

Each result gains the physical stop for boarding and alighting, so the app can show the
correct side of the road without a second request:

```jsonc
{ "id": 4211, "route": "101", "start": "07h15", "end": "08h05",
  "boarding":  { "code": "1002", "lat": 37.737628, "lon": -25.67039, "sequence": 1 },
  "alighting": { "code": "5186", "lat": 37.825211, "lon": -25.497905, "sequence": 36 },
  "headsign":  "RIBEIRINHA (CASA DO POVO)",
  "direction": 0 }
```

`code` is the number printed on the physical stop pole — the most useful single piece of
disambiguation we can give a user standing on a street with a stop on each side.

Keep these keys **additive and optional**. Legacy-dataset results have no
`external_stop` and simply omit them; older clients ignore them.

### 7.2 Bootstrap

`tenancy/bootstrap.py:serialize_bootstrap()` gains the `transitSchedule` block from
[00 Decision 1](00-overview-and-decisions.md), plus `trackingEnabled`. Banner and badge
copy live in `Island.feature_flags` as `{pt, en, …}` maps so they are editable per
locale without a release.

### 7.3 Offline bundle

`transit/services/offline_bundle.py`:

- `build_offline_bundle()` emits **both** datasets. Either tag each route row with
  `dataset`, or split into `routes` (active) + `futureRoutes` — tagging is simpler and
  keeps one code path.
- Include `cutoverDate` and the banner/badge copy so an offline client can render the
  right phase.
- `compute_bundle_version()` must fold in **`dataset` counts and the cutover date**, or
  a phase change would not invalidate cached bundles. Today it hashes
  `island.key:revision:stops_count:routes_count` — extend that string.

**Size.** ~895 journeys × ~36 stops, with stop names repeated as strings, is roughly
1.3 MB before the legacy dataset is added. Mitigations, in order of preference:

1. Emit `stops` as **indices into the bundle's stop array** rather than repeated names.
2. Ship times as seconds-since-midnight ints instead of `"07h15"` strings.
3. Gzip the response (`Content-Encoding`), which the client already handles.

Measure the real number before optimising — but measure it *before* shipping to Premium
users on mobile data.

---

## 8. Live tracking — built, disabled

Mirror `minibus/` almost line for line; the payloads are the same vendor's
([01 §6](01-upstream-api-reference.md)).

`azoresbus/tracking_client.py` — copy of `minibus/tracking_client.py` with
`AZORESBUS_TRACKING_BASE_URL` and `/locations`, `/locations/{id}`.

`azoresbus/services_tracking.py` — copy of `minibus/services_tracking.py`, keeping the
cache-TTL / stale-grace / single-flight-lock behaviour and the health probe. Cache keys
namespaced `azoresbus:tracking:*`.

```
GET /api/v3/azoresbus/vehicles          → fleet snapshot
GET /api/v3/azoresbus/vehicles/{id}     → vehicle detail
GET /api/v3/azoresbus/tracking/health   → availability probe
```

**The flag gate:** when `feature_flags['azoresbus']['trackingEnabled']` is false, the
endpoints return `503` with `{"error": {"code": "tracking_disabled"}}` and bootstrap
reports `trackingEnabled: false`. The app hides the entry point. Flip the flag in admin
→ live in every installed build.

**Empty fleet is not an error.** `[]` means "no buses reporting", which is the correct
answer at 03:00 and the correct answer today. Distinguish it from `tracking_disabled`
and from an upstream failure — three different states, three different UI treatments.

Map `id` → our data via `ExternalJourney.external_id` / `ExternalStop.external_id`, so a
tracked vehicle can be joined to a `Trip` and its `currentStopSequence` resolved to a
real stop.

---

## 9. Testing

| Area | Test |
|------|------|
| **Back-compat** | Search with no `dataset` param, before cutover → identical results to today. **Write this first.** |
| Date resolution | Frozen clock at 2026-08-31T23:59 and 2026-09-01T00:01 (Atlantic/Azores) → legacy then azoresbus |
| Explicit override | `?dataset=azoresbus` in August returns the new network |
| Sync idempotency | Run twice against fixtures → second run writes nothing, `payload_hash` skips all detail fetches |
| Sync pruning | Route removed upstream → its trips are pruned, others untouched |
| Rate limiter | Fake 429 with `Retry-After` → honoured; consecutive failures abort |
| Midnight rollover | Journey with `departureTime > 86400` → correct `day_offset`, stop order preserved |
| Stop collapse | 1456 fixtures → 816 stops; any name spanning > 75 m is flagged |
| **Loop routes** | **Route 335 (37 repeated names) and 301 (loop): `C → A` where `A` is also stop 1 returns the trip, boarding at the later sequence. This is the regression the old `find()` logic fails.** |
| Boarding pole | Both directions of route 101 → `boarding.code` differs per direction (`1002` vs `1001`) |
| Pole on legacy | Legacy-dataset result omits `boarding`/`alighting` rather than emitting nulls |
| Tariffs | Same `content_hash` twice → one snapshot row; changed payload → new row, old `is_current=False` |
| Tracking flag | Flag off → `503 tracking_disabled`; flag on + empty upstream → `200 []` |
| Bundle version | Cutover date change → new fingerprint |
| Timezone | All date logic in `Atlantic/Azores`, not UTC — the cutover is a local midnight |

Fixtures: capture real upstream responses for routes `101` (small), `301` (large, 17
weekday journeys), and `N02` (night) and commit them under
`azoresbus/tests/fixtures/`. Never hit the network in tests.

---

## 10. Rollout

1. Ship schema + sync, run `--dry-run`, inspect the diff. **No client impact** — nothing
   reads `dataset` yet.
2. Run the real sync. Verify 55 lines / ~895 trips / 816 stops under `dataset='azoresbus'`.
   Legacy search still works because the filter defaults to date-resolved and it is August.
3. Ship `transitSchedule` in bootstrap with `previewEnabled: false`. App-side work lands
   feature-detected and dormant.
4. Flip `previewEnabled: true` → preview phase begins.
5. **1 September:** nothing to deploy. `resolve_dataset()` flips at local midnight.
6. **1 October:** nothing to deploy. `bannerUntil` passes, banner retires.
7. Whenever the fleet reports: flip `trackingEnabled`.

Steps 5 and 6 requiring no deploy is the whole point — verify both by moving
`cutoverDate` on staging and watching an **unmodified** app build follow.

Add a monitoring alert on `SyncRun`: no successful `schedules` run in 10 days → page.
Silent sync failure is the highest-likelihood way this goes wrong.
