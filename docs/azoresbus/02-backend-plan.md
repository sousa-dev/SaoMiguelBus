---
title: "feat: AzoresBus changeover — API backend plan"
status: draft
date: 2026-08-14
revision: 2
supersedes: 2026-08-13 draft
type: feat
target_repo: SaoMiguelBus-api
source_of_truth: 98-review-findings.md
---

# Backend plan — `SaoMiguelBus-api`

All paths relative to `SaoMiguelBus-api/src/`. Read
[01-upstream-api-reference.md](01-upstream-api-reference.md) first — the sync design
follows directly from the measured upstream behaviour, and both were rewritten on
2026-08-14 against [98-review-findings.md](98-review-findings.md).

---

## 1. What already fits — and what does not

> **Corrected.** The 2026-08-13 draft opened by claiming `transit.Calendar` was an
> "exact match" for upstream. It is not (`98` **B0**). That single row was the reason
> the rest of the plan was unsafe.

| Existing | Fit |
|----------|-----|
| `transit.Calendar` — `WEEKDAY`/`SATURDAY`/`SUNDAY` (`transit/models.py:23–31`) | ❌ **Not a match.** Upstream is weekday-specific **and** school-term/seasonal ([01 §4.2](01-upstream-api-reference.md)). Must be expanded/replaced — §3.3 |
| `search.get_type_of_day()` holiday → `SUNDAY` (`transit/services/search.py:11–19`) | ⚠️ **Necessary, not sufficient.** Upstream applies the same rule for every holiday probed, but it does nothing for 102/112/315/318/307 (`98` §6) |
| `StopTime.departure_time` as `TimeField` (`transit/models.py:114`) | ⚠️ Keeps working, but needs a `day_offset` companion — night journeys **wrap** (§4.2) |
| `search_routes()` first-occurrence matching (`search.py:106`) | ❌ Broken on loops and repeaters; and the fix must reach the app too (`98` **B7**) — §3.4 |
| `Island.feature_flags` JSON (`tenancy/models.py:28`) | ✅ Storage fits, but bootstrap serializes modules + `maps`/`version` only (`tenancy/bootstrap.py:33–75`). `transitSchedule` is **new work**, not a reuse (`98` §6) |
| `MinibusImportMeta` (`minibus/models.py:83–87`) | ✅ Template for import metadata, reuse the shape |
| `minibus/tracking_client.py` + `services_tracking.py` | ✅ Cache/lock/stale-grace layer to mirror |
| `offline_bundle.py` `data_revision` + `compute_bundle_version` | ⚠️ Extend: the fingerprint is `island.key:revision:stops_count:routes_count` and will not change on a phase or season flip (`98` §6) |
| `MinibusLine.route_shapes` JSON | ✅ Precedent for storing encoded polylines |
| `legacy_import.py` / `validate_legacy_parity.py` | ❌ Dataset-blind; will crash or corrupt once AzoresBus rows exist (`98` **B8**) — §3.6 |
| `django_celery_beat` via migration (`minibus/migrations/0006_…`) | ✅ Scheduling pattern to copy |

So the work is **not** mostly additive. Four things genuinely need designing: the dataset
tag, **the service calendar**, the sampling sync worker, and the stop-identity mapping —
plus a mechanical but wide isolation sweep (§7.0).

---

## 2. New Django app: `azoresbus`

Keep the sync/tariffs/tracking concerns in their own app rather than swelling `transit`.
The *schedule data itself* still lands in `transit` models so search, offline bundle,
directions and trip detail work unchanged.

```
src/azoresbus/
  __init__.py  apps.py  admin.py
  models.py                 # ExternalStop, ExternalJourney, TariffSnapshot, SyncRun,
                            #   ServiceObservation
  client.py                 # rate-limited HTTP client for azb.elevensystems.pt
  tariffs_client.py         # azoresbus.pt/static/json/tariffs.json
  services_sync.py          # upstream → transit.* models
  services_calendar.py      # observation matrix → ServicePattern derivation
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

**Uniqueness changes** (the backwards-compatibility crux):

```python
# Line:  ('island', 'code')          → ('island', 'dataset', 'code')
# Stop:  add index ('island', 'dataset', 'cleaned_name')
```

This is not hypothetical. Legacy `app_route.route` already contains
`101, 102, 103, 105, 108, 109, 110, 111, 112, 200, 202, 203, 205, 206, 208, 210, 211,
212, 216, 218, 219, 301, 302, 306, 311, 312, 314–318, 322, 324, 326, 328` — every one of
which is also an AzoresBus `nameShort` (`98` **B4**). Without `dataset` in the key the
migration fails on real data, and `get_line_v3` raises `MultipleObjectsReturned` the
moment both exist.

> **Evidence note:** the local `src/db.sqlite3` has **zero** `transit_line` rows. The
> collision list above is evidenced from `legacy/src/db.sqlite3` (`app_route`), not from
> a live v3 import (`98` **B4**). Any "measure it locally" step in this plan needs a real
> import first.

Migration steps:
1. `AddField` with `default='legacy'` — every existing row is correctly tagged by the default.
2. `AlterUniqueTogether` / `AddIndex`.
3. No data migration needed. This is the payoff for choosing `legacy` as the default.

### 3.2 Stop identity

Upstream has **1456 stops but only 816 distinct names**
([01 §2](01-upstream-api-reference.md)). The duplicates are the two sides of a road:

| Measure | Value |
|---------|-------|
| Distinct names | 816 (181 singletons, 630 pairs, 5 triples) |
| Median separation within a name | **11.5 m** |
| Mean / max | **16.5 m** / **164.1 m** |
| Groups > 100 m apart | **3** |
| Groups > 75 m apart | **14** |
| Pairs with consecutive integer codes | **629 of 630** |

> **Corrected numbers.** The 2026-08-13 draft said median 12 m / mean 17 m and flagged
> "**30 groups today**" over 75 m. Measured: median 11.5, mean 16.5, and **14** groups
> (`98` claim 2, §3). The 75 m import check will fire 14 times on the first import — size
> the review queue accordingly.

And the pairs are **direction-selected**: of route 101's 27 names served both ways,
**24 use a different code in each direction** (route 102: 10 of 14). Which pole a trip
serves is in `circulations[].stage.id`.

> **So the user never has to choose a side.** Which pole you board at is a property of
> the *trip*, derived from its direction. It is not a search input.

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

**`StopTime` must also carry the pole**, or collapsing destroys information the data
gives us:

```python
# transit/models.py — StopTime
external_stop = models.ForeignKey('azoresbus.ExternalStop', null=True, blank=True,
                                  on_delete=models.SET_NULL, related_name='stop_times')
```

Nullable, so every legacy row stays valid. Without it we cannot draw the boarding marker
on the correct side of the road, and cannot resolve a live vehicle's
`currentStopSequence` to a physical stop.

So: **search and pickers use the 816 collapsed `Stop` rows; rendering uses
`StopTime.external_stop`.**

**Import checks:**
- Flag any collapsed name whose members span **> 75 m** (expect **14**, worst 164.1 m).
- Emit a **walking-distance hint** on results for the 3 groups > 100 m (Covoada 164.1,
  Alfândega 134, Forte S. Brás 108) — a hint on the result card, not a second picker row
  (`98` §5 challenge 3). Whether Covoada 164 m is genuinely the wrong collapse on the
  street is an **open question** (`98` §7); the flag is how we find out.
- `CAPELAS (LG. TEATRO NOVO)` (codes `1268`/`1270`, 18.4 m) is the one non-consecutive
  pair. Do not treat non-consecutive codes as a collapse error.
- **No accessibility fields exist upstream.** Collapsing hides which pole has a shelter;
  that is a known, unfixable-in-v1 loss, not a bug to chase.

### 3.3 Service calendar — the schema rewrite

> **This section replaces the 2026-08-13 "map onto `transit.Calendar`, no schema change
> needed for calendars"** (`98` **B0**).

**Requirement:** answer *"does trip T run on ISO date D?"* — in search, in the offline
bundle, and in the bundle the client resolves without a server.

`transit.Calendar` (`transit/models.py:23–31`) has exactly three rows per island and a
`unique_together ('island','service_type')`. It cannot express "Tuesday and Thursday,
school term only" (line 112) or "Wednesday only" (102 journey `1009`) or "38 journeys
from 14 September, 33 in July" (307).

**New models, GTFS `calendar` / `calendar_dates` shaped:**

```python
# transit/models.py  (new; Calendar is retained for legacy rows, see below)

class ServicePattern(TenantScopedModel):
    """Which dates a set of trips operates on. GTFS `calendar` + `calendar_dates`."""
    dataset    = models.CharField(max_length=16, choices=DATASET_CHOICES,
                                  default=DATASET_LEGACY, db_index=True)
    key        = models.CharField(max_length=64)       # stable hash of the rule below
    monday     = models.BooleanField(default=False)
    tuesday    = models.BooleanField(default=False)
    wednesday  = models.BooleanField(default=False)
    thursday   = models.BooleanField(default=False)
    friday     = models.BooleanField(default=False)
    saturday   = models.BooleanField(default=False)
    sunday     = models.BooleanField(default=False)
    start_date = models.DateField(null=True, blank=True)   # null ⇒ unbounded
    end_date   = models.DateField(null=True, blank=True)
    # Provenance: this rule was DERIVED from a sample, not published by the operator.
    derived_from_run = models.ForeignKey('azoresbus.SyncRun', null=True, blank=True,
                                         on_delete=models.SET_NULL)
    confidence = models.CharField(max_length=16, default='sampled')  # sampled | official

    class Meta:
        unique_together = [('island', 'dataset', 'key')]


class ServiceException(TenantScopedModel):
    """GTFS calendar_dates: force a date on or off for one pattern."""
    ADDED = 1
    REMOVED = 2
    service   = models.ForeignKey(ServicePattern, on_delete=models.CASCADE,
                                  related_name='exceptions')
    date      = models.DateField(db_index=True)
    exception_type = models.PositiveSmallIntegerField(choices=[(ADDED, 'added'),
                                                              (REMOVED, 'removed')])

    class Meta:
        unique_together = [('service', 'date')]
```

`Trip` gains `service = FK(ServicePattern, null=True)`. **`Trip.calendar` stays**,
nullable, so every legacy row and every existing query keeps working during the
migration; legacy trips get a `ServicePattern` back-filled from their `Calendar`
(`WEEKDAY` → Mon–Fri true, unbounded; `SATURDAY` → Sat; `SUNDAY` → Sun). After the
back-fill, `Calendar` is read only by legacy code paths and can be retired separately.

**Evidence table — keep the raw sample, do not throw it away:**

```python
# azoresbus/models.py
class ServiceObservation(TenantScopedModel):
    """One row per (journey, sampled date) where upstream returned the journey.

    This is the ground truth the ServicePattern rules are derived from. Keeping it
    means a later sample can re-derive patterns without re-fetching, and a pattern
    change is diffable rather than mysterious.
    """
    dataset     = models.CharField(max_length=16, default='azoresbus')
    external_id = models.CharField(max_length=32, db_index=True)   # journey id
    date        = models.DateField(db_index=True)
    run         = models.ForeignKey('azoresbus.SyncRun', on_delete=models.CASCADE)

    class Meta:
        unique_together = [('island', 'dataset', 'external_id', 'date')]
```

**Derivation rule** (`azoresbus/services_calendar.py`), from the observation matrix:

1. For each journey, collect the sampled dates it appeared on and the sampled dates it
   did **not**.
2. **Drop holiday dates from weekday inference.** Upstream resolves holidays to the
   Sunday set ([01 §4.2](01-upstream-api-reference.md)), so a journey's absence on
   2026-12-08 says nothing about Tuesdays.
3. Set the weekday bit where the journey appeared on **every** non-holiday sampled date
   of that weekday, and clear it where it appeared on **none**. A weekday where the
   sample is split is an **ambiguity** — record it, do not guess (see below).
4. Set `start_date` / `end_date` from the season boundary the sample brackets. Line 307's
   school extras appear in the term sample and not in the summer sample, so they get
   `start_date` = the earliest term date observed and `end_date` = null-with-a-flag,
   because **we do not know when term ends**.
5. Group journeys with identical rules onto one `ServicePattern`; `key` is a hash of the
   rule.

**The honesty requirements on this derivation, stated as build requirements:**

- `confidence='sampled'` is the default and it means *"inferred from N observed dates"*.
  Only an operator-published calendar sets `official`.
- **A boundary derived from a sample is a lower/upper bound, not a date.** We observe the
  307 flip between 2026-09-11 (33) and 2026-09-14 (38). The real term start is somewhere
  in `(2026-09-11, 2026-09-14]`. Store the **bracket**, and resolve `start_date` to the
  conservative end of it (the later date) so we never claim a school run exists before we
  have seen it. **2026-09-14 is observed, not official** (`98` §7).
- **Ambiguity is recorded, not resolved.** A journey seen on two of three sampled
  Tuesdays goes into `SyncRun.stats['ambiguous']` and raises an alert. Do not average.
- Re-derivation is idempotent: the same observation matrix produces the same `key`.

**Search resolution** — `does_run(trip, on_date)`:

```
effective_weekday = SUNDAY if is_holiday(on_date) else on_date.weekday()
   # holiday→Sunday stays: get_type_of_day (search.py:11–19) matches upstream for every
   # holiday probed (98 §6). Necessary, not sufficient — it is applied on TOP of the mask.
if a ServiceException(date=on_date) exists:  return exception_type == ADDED
if start_date and on_date < start_date:      return False
if end_date   and on_date > end_date:        return False
return pattern.<effective_weekday> is True
```

The query form used by `search_routes` is a single filter on the pattern's weekday
column plus a date-range predicate plus a `NOT EXISTS` on removals — index
`('island','dataset')` on `ServicePattern` and `('service','date')` on
`ServiceException`.

**Bundle resolution** must be the *same rule*, expressed in the payload (§7.4) so the
client can evaluate it offline against an ISO date. Not `WEEKDAY|SAT|SUN`.

### 3.4 Repeated stop names within a journey — breaks the existing search

**The sharpest edge in the changeover, and it is not server-only.**

At least 13 routes revisit the same stop name within a single journey, in a
first-journey-per-route sample — a **lower bound**, since `102` and `305` also repeat on
later journeys (`98` claim 12):

| Route | Repeated names | Journey length |
|-------|----------------|----------------|
| 335 | **36 names, 37 extra visits** | 97 stops |
| 301, 303, N01 | 14 | 59 / 59 / 68 |
| 306 | 9 | 43 |
| N03, N05, 323, 105 | 2–3 | 17–54 |
| 108, 110, 202, 312 | 1 | 27–75 |

**Loops** (first and last stop share a name): `301`, `303`, `306`, `323`, `N03`; **plus**
`328` (weekend loop) and `305` **journey `608`**. **`335` is *not* a loop** — it is a long
route with repeats. Ten routes are single-direction.

**Three** implementations resolve stops by **first occurrence**:

```python
# transit/services/search.py:106
if stops_str.find(origin) > stops_str.find(destination):
    continue
```
```ts
// lib/offline-bundle.ts:218
const originIndex = stopKeys.indexOf(originKey);
```
```ts
// lib/transit-format.ts:172–199 — extractTripSegment
if (stopMatchesQuery(destQuery, stop.name)) { if (!foundOrigin) { return null; } }
```

…and a fourth in the legacy PWA (`SaoMiguelBus-webapp/legacy/js/offlineHandler.js:270–281`).

On a loop `A → B → C → D → A`, a search for `C → A` finds `A` at index 0, concludes origin
comes after destination, and **discards a valid trip**.

> **Fixing only `search.py` changes nothing user-visible** (`98` **B7**). Online results
> are piped through `processTransitResults` → `extractTripSegment`
> (`features/transit/hooks/useOfflineSearch.ts:75–81`), which re-matches by name and
> discards the server's correctly chosen pair. The fix is end-to-end
> ([00 Decision 5](00-overview-and-decisions.md), [03 §5c](03-mobile-plan.md)).

**Fix — match on sequence, not string position:**

```python
def _valid_pairs(trip, origin_stop_id, destination_stop_id):
    """All (board, alight) pairs on this trip where board precedes alight."""
    times = trip.stop_times.order_by('sequence')
    origins = [st for st in times if st.stop_id == origin_stop_id]
    dests   = [st for st in times if st.stop_id == destination_stop_id]
    return [(o, d) for o in origins for d in dests if o.sequence < d.sequence]
```

**Tie-break — identical rule on server, offline client, and webapp, or results diverge:**

1. earliest **boarding** timestamp `(board.day_offset, board.departure_time)`
2. then shortest **elapsed duration** `alight − board`, offsets included
3. then stable trip id

**Not stop count.** On 335, with 36 repeated names, "fewest stops" can select a one- or
two-stop hop that is not the ride the user wants (`98` §5 challenge 4).

**Boarding-time filter (behaviour change, deliberate).** `search.py:113–118` currently
filters on the **trip's first stop time**, so a late board on a loop that departed
earlier is dropped. The new matcher compares the requested start against the **selected
board stop's** time. Note the app sends `start: '00h00'` on every online search
(`useOfflineSearch.ts:44`) and reorders client-side, so this is invisible to today's app —
but the webapp and any future caller will see it.

Two bonuses: it drops `clean_string` blob building from the hot loop (currently rebuilt
per trip, per search), and it resolves origin/destination by stop **id** rather than
fuzzy substring, removing mis-hits like `ACHADA` matching `ACHADINHA`.

**Test against 335 and 301 specifically**, with fixtures shared byte-for-byte with the
TypeScript contract test (§9).

### 3.5 Journey identity

```python
class ExternalJourney(TenantScopedModel):
    dataset      = models.CharField(max_length=16, default='azoresbus')
    external_id  = models.CharField(max_length=32)      # globally unique upstream
    route_ext_id = models.CharField(max_length=32)
    direction    = models.PositiveSmallIntegerField()
    shape        = models.TextField(blank=True, default='')   # encoded polyline
    payload_hash = models.CharField(max_length=64)   # of the DETAIL body — see §4.4
    identity     = models.CharField(max_length=128)  # f'{route}|{start}|{end}' — republish guard
    trip         = models.ForeignKey('transit.Trip', on_delete=models.CASCADE)

    class Meta:
        unique_together = [('island', 'dataset', 'external_id')]
```

`identity` exists because **a journey ID is not a stable content key across a
republish** (`98` §7). IDs 505–514 held from 2026-08-08 to 2026-09-05, but that window
contains no known timetable rewrite. Storing `(route, start, end)` alongside the id lets
the sync log `id → (start, end, route)` diffs and alert on churn, instead of silently
reusing a row whose meaning changed.

> **`payload_hash` does not save requests.** See §4.4.

### 3.6 Pinning legacy import and parity to `dataset='legacy'` (`98` **B8**)

Both are dataset-blind today and will break or corrupt once AzoresBus rows exist. This is
not optional cleanup — it is a prerequisite for the migration.

| File:line | Today | Required |
|-----------|-------|----------|
| `transit/services/legacy_import.py:617–625` | `Stop.objects.update_or_create(island=, cleaned_name=)` | add `dataset=DATASET_LEGACY` to the lookup **and** the defaults |
| `legacy_import.py:696–700` | `Line.objects.update_or_create(island=, code=)` | same — otherwise re-running the importer **overwrites the AzoresBus `101`** |
| `legacy_import.py:742–745` | stop match `.filter(island=, cleaned_name=).first()` | add `dataset=DATASET_LEGACY`; `.first()` on a two-network table is arbitrary |
| `tenancy/management/commands/validate_legacy_parity.py:33–44` | `Stop.objects.count()` / `Trip.objects.count()` | filter `dataset=DATASET_LEGACY`, or the parity check **fails permanently** the day AzoresBus lands |

Every `Trip` write in the importer must set `dataset=DATASET_LEGACY` explicitly rather
than relying on the field default, so a later default change cannot silently retag legacy
rows.

### 3.7 Sync bookkeeping

```python
class SyncRun(TenantScopedModel):
    KIND_SCHEDULES = 'schedules'; KIND_TARIFFS = 'tariffs'
    kind        = models.CharField(max_length=16)
    status      = models.CharField(max_length=16)   # running|completed|failed|partial
    started_at  = models.DateTimeField(default=timezone.now)
    finished_at = models.DateTimeField(null=True, blank=True)
    request_count = models.PositiveIntegerField(default=0)
    sampled_dates = models.JSONField(default=list)  # the exact ISO dates this run used
    stats       = models.JSONField(default=dict)    # counts, diffs, ambiguities, prune decision
    error       = models.TextField(blank=True)
```

`sampled_dates` is first-class, not buried in `stats`: it is the only way to know later
whether a pattern was derived from a term week, a summer week, or a poisoned holiday.

`stats` must carry, at minimum: per-entity created/updated counts, `journey_count` (for
the prune floor, §4.5), `id_identity_diffs` (§3.5), `ambiguous` service inferences
(§3.3), and the prune decision with its reason.

### 3.8 Adjacent `transit` models the changeover touches

> **Discovered 2026-08-14 while auditing the plan for completeness — not in `98`.** The
> B4 sweep ([§7.0](#70-dataset-isolation-sweep--every-reader-not-just-search-98-b4))
> covers everything that *reads* `Stop`/`Line`/`Trip`. These four models are neither
> readers nor covered by the `dataset` tag, and each breaks in its own way.

| Model | File:line | Problem | Required |
|-------|-----------|---------|----------|
| **`Operator`** | `transit/models.py:11`, `unique_together ('island','name')` | Every `Line` needs an `Operator`. `legacy_import.py:696–700` resolves it via `infer_operator_name(route)` (`legacy_import.py:288–293`), which maps **legacy** route-code prefixes to legacy operator names and returns `'Other'` for anything unrecognised — so every AzoresBus line would land under `Other` | Create an explicit `Operator(name='AzoresBus')` in the sync's bootstrap step and assign it to all 55 lines. Do **not** route AzoresBus codes through `infer_operator_name` |
| **`RouteInfo`** | `transit/models.py:73–82` | Disruption notices, scoped by a free-text `company` string with **no line FK and no dataset**, plus `start`/`end` validity. `01 §8` says alerts "stay on `RouteInfo`, curated by hand" — true, but after cutover the existing rows describe an operator that no longer runs | Add `dataset` (default `legacy`) so post-cutover readers do not surface legacy disruption notices for the new network. Audit existing rows for `end` dates past 1 September and expire them |
| **`StopGroup`** | `transit/models.py:137–145`, `unique_together ('island','name')`, `stop_names` JSON | **Live, not dead code** — `services/ads.py:48,53` iterates `StopGroup.objects.all()` to target ads by stop-name group, and `legacy_import.py:59` populates it as an import step. Name-keyed with no dataset, so AzoresBus stop names either fall outside every group (ads stop targeting) or collide with a legacy group of the same name | Add `dataset`; extend the uniqueness key to `('island','dataset','name')`; decide whether AzoresBus needs its own groups or whether ad targeting should collapse across datasets by name. **This is also the model to check before writing new collapse logic** — it is a pre-existing name-grouping mechanism, unrelated to `ExternalStop` (§3.2) but easy to confuse with it |
| **Trip votes** | `transit/api_v3.py:239–266`; client mirror `TripVoteEntry` in `lib/profile-store.ts` | Votes key on `trip_id`. Legacy trip IDs and AzoresBus trip IDs come from the same sequence, so a legacy vote does not *collide*, but `search.py`'s `_trip_likes_percent` prefixes a route code with `C` when likes < 60 % — a brand-new network starts with zero votes on every trip | Confirm the `< 60 %` branch cannot mark every AzoresBus route as unconfirmed on day one. Either seed neutral, exempt trips with no votes, or gate the prefix on a minimum vote count. **Check this before 1 September** — it is a silent, network-wide UI regression |

**Not a gap, checked:** `features/transit/share-trip.ts:11` shares a formatted **text
string**, not a deep link with a trip id — the id appears only in the analytics call. Stale
share messages degrade to stale text, which is acceptable. No migration needed.

---

## 4. The sync worker

### 4.1 Date sampling — replaces "three canonical dates"

> **This section replaces the 2026-08-13 "resolve three canonical dates after the
> cutover: next Wednesday, next Saturday, next Sunday."** That strategy fails twice:
> a clean Wednesday in 1–13 September stores the **summer** timetable, and a **holiday**
> Wednesday stores the **Sunday** set as weekday service (`98` **B0**, **B6**).

```
1  GET /api/stops                                     →  1
2  GET /api/routes?active=true&passengerInfo=true     →  1     (55 routes, ALL of them)
3  for each of 55 routes:
       GET /api/routes/{id}                           →  55    (shape + stop set)
4  build the DATE SAMPLE (below)                      →  ~16 dates
   for each route × sampled date:
       GET /api/routes/{id}/journeys?day={date}       →  ~880
       record a ServiceObservation per (journey id, date)
5  for each journey id observed anywhere in the sample:
       GET /api/routes/{r}/journeys/{j}               →  ~1200  (see §4.4 — unavoidable)
6  derive ServicePattern rows from the observation matrix (§3.3)
7  upsert transit.{Stop,Line,Trip,StopTime} under dataset='azoresbus'
8  prune — ONLY if the safety floor passes (§4.5)
9  bump_data_revision() once, prewarm both bundle endpoints
```

**The date sample is tiered.** `AZORESBUS_SYNC_DATE_SAMPLE` — computed, overridable per
run. Not every group is re-fetched on every run:

| Group | Dates | Cadence | Why |
|-------|-------|---------|-----|
| **Near week** (the season we are in) | 7 consecutive days, Mon–Sun, starting from the next Monday | **Every run** | Captures per-weekday sets in the season that is actually being served: 112 Tue/Thu, 102 Wed vs Fri extras, 315 Wed, 318 Fri ids, 321/324/325 (`98` **B0**) |
| **Far week** (the other season) | 7 consecutive days, Mon–Sun, inside the opposite season | **Monthly, or when a sentinel changes** — otherwise reuse the stored `ServiceObservation` rows | Supplies the **season contrast**: date bounds for the derived patterns, and the "out of season ≠ deleted" evidence the prune needs (§4.5) |
| **Holidays** | 2–3 known weekday holidays | Every run while ≤ 90 days out | Confirms upstream still resolves them to Sunday; recorded as `ServiceException` evidence, never as weekday evidence |
| **Sentinel probe** | ~4 dates, one per sentinel line, ~4 weeks forward | Every run | Term-boundary detector (below) |

**Cost:** a **full** run (near + far + holidays) is ≈ 2 150 requests, ≈ 13 min at 0.35 s.
An **incremental** run (near + holidays + sentinels, far week reused from
`ServiceObservation`) is ≈ **1 150 requests, ≈ 7 min**
([01 §9](01-upstream-api-reference.md)). That halving is what makes the daily late-August
cadence (§4.6) affordable — ~4 weeks of daily full runs would be ~60 000 requests against
a host that publishes no rate limit.

> **Why the far week is not simply dropped.** Re-syncing weekly *does* self-heal one
> thing: per-weekday granularity in the far season. Come July 2027 the near week **is** a
> summer week, sampled Mon–Sun, so summer's weekday structure gets learned then — there is
> no need to pay for that resolution today. Two things it does **not** heal, because both
> are consumed by clients or by the prune *before* the far season arrives:
>
> 1. **Date bounds on the derived patterns.** A journey observed only in the current
>    season, with no contrast, derives an **unbounded** rule. So the 33-journey summer 307
>    set would be marked as running indefinitely, and the five school extras as never
>    running, until a sync happens *inside* the other season. The server would self-correct
>    within a week of 14 September; **an offline bundle downloaded in August would not** —
>    it carries the rule, not the sync schedule ([02 §7.4](02-backend-plan.md)). Wrong for
>    exactly the users who cannot refetch.
> 2. **Prune safety.** §4.5 rule 4 needs to tell "gone" from "out of season", and that
>    distinction exists *only* if the other season is in the observation matrix. Without a
>    far week you get one of two bad outcomes: never prune (stale rows accumulate forever),
>    or prune the far season's journeys on every run and re-import them six months later —
>    which also trips the §4.5 ratio floor twice a year.
>
> Neither needs the far week to be **fresh**, which is why it is cached rather than
> refetched. It needs to have been observed **once**, and re-observed when a sentinel says
> the timetable moved.

Rules the sampler must enforce:

- **Never sample a weekday that is a known holiday as weekday evidence.** 2026-12-01 and
  2026-12-08 are weekdays returning Sunday sets (`98` **B6**). If a chosen week contains
  one, shift the week or substitute that weekday from the adjacent week.
- **Do not trust the `Holiday` table to make that guard work — verify it, and detect
  holidays from the data as well.** Production `transit_holiday` currently holds 16 rows
  ending at **2025-06-19**, with **zero** entries for 2026 or 2027 (checked against
  `api.saomiguelhub.com/api/v3/bootstrap`, 2026-08-14). A guard phrased as "skip known
  holidays" is a **no-op** against an empty table, and the sampler would record
  2026-12-08's Sunday set as Tuesday evidence — B6, arriving through the mitigation for
  B6. Three requirements follow:
  1. **Hard-fail the run** if the sample spans a date range for which the `Holiday` table
     has no rows at all. An empty holiday set for a year is a seeding bug, not a year
     without holidays. Refuse to derive patterns rather than derive poisoned ones.
  2. **Seed 2026–2027 first** ([00 prerequisite](00-overview-and-decisions.md)) and assert
     the seed contains the 8 dates `98` confirmed resolve to Sunday.
  3. **Detect holidays from upstream, not just from our table.** A weekday whose journey
     set for a route equals that route's *Sunday* set — and differs from its other
     weekdays — is a holiday as far as upstream is concerned, whatever our table says.
     Record it as a `ServiceException` and exclude it from weekday inference. This is the
     only mechanism that covers regional dates we have not seeded and holidays upstream
     honours that Portugal's national list does not.
- **Never sample before the data floor.** `2026-07-27` is the earliest populated date;
  earlier dates return `[]` because the feed has no data, not because of any semantics
  ([01 §4.1](01-upstream-api-reference.md)). Sampling below the floor would look like a
  network-wide deletion and trip the prune.
- **Compute the sample, never hardcode a term start in code.** The observed boundary
  lives in `Island.feature_flags['azoresbus']['observedTermStart']`, editable in admin,
  and is treated as a bracket (§3.3), not a fact.
- **Sample forward until the pattern flips.** Because term end is unknown, a weekly job
  adds one probe week further into the future (e.g. +4 weeks) each run and compares the
  journey set for a handful of sentinel lines (**307**, **112**, **321**) against the
  stored pattern. A change raises an alert and schedules a full re-derivation. This is
  the mechanism that replaces the term calendar we do not have (`98` §7).

- **A far week must exist in the observation matrix before the first prune.** The very
  first run is therefore always a **full** run. An incremental run that finds no stored
  far-season observations upgrades itself to a full run rather than proceeding — otherwise
  the first prune has no way to tell "out of season" from "deleted" (§4.5).
- **Invalidate the cached far week when it stops being far.** When the near week crosses a
  season boundary, the two swap roles: the season just left becomes the far week and its
  stored observations are now the cached contrast, while the season just entered must be
  sampled fresh. Detected from `observedTermStart` and the sentinel probe, not from a
  hardcoded month.

### 4.2 Time conversion — wrap detection, not `divmod`

> **This replaces the 2026-08-13 §4.2 `divmod(seconds, 86400)` converter. That branch
> never fires** (`98` **B2**): there are **zero** `departureTime` values above 86400
> anywhere. Max on a listing is `86340`; max in night-route details is `86369`.

Past midnight is a **wrap to zero inside one journey**. N03 journey `984`: `startTime
83700` (23:15), seq 42 departs `86341`, seq **43** departs **`0`**, seq 47 departs `600`,
`endTime: 600`.

```python
def circulations_to_stop_times(circulations):
    """Assign day_offset by detecting a DECREASE along sequence.

    Upstream never emits >86400 (98 B2); past-midnight wraps to 0 on the same journey.
    """
    offset = 0
    previous = None
    for c in sorted(circulations, key=lambda c: c['sequence']):
        seconds = int(c['departureTime'])
        if previous is not None and seconds < previous:
            offset += 1                 # wrapped past midnight
        previous = seconds
        yield {
            'sequence': c['sequence'],
            'departure_time': datetime.time(seconds // 3600, (seconds % 3600) // 60,
                                            seconds % 60),
            'day_offset': offset,
        }
```

Add `StopTime.day_offset = PositiveSmallIntegerField(default=0)`. Legacy rows default to
0 and are unaffected. `StopTime.departure_time` stays a `TimeField`
(`transit/models.py:114`) — the field is fine, the old *conversion rule* was wrong.

**Ordering is the part that corrupts data if missed.** Every sort and every comparison
must use `(day_offset, departure_time)` or `sequence` — **never a bare `TimeField`
sort**. That covers: the `_valid_pairs` scan (§3.4), the trip-detail serializer, the
offline-bundle row builder, the boarding-time filter, and any admin ordering. Storing
`00:10` without an offset and then ordering by time reorders N03's trip.

**Do not treat a 00:00 start as a wrap.** N02 has a genuine journey with `startTime: 0`,
`endTime: 3900`, sitting beside 21:50 and 22:55 journeys. It is a *separate journey*, not
a continuation. Only a decrease **within one journey's circulations** is a wrap.

### 4.3 Rate limiting

In `azoresbus/client.py`:

- **Serial only.** No concurrency. One in-flight request.
- **Base delay** `AZORESBUS_SYNC_DELAY` (default `0.35`), plus ±20 % jitter. The review
  sustained ~2.8 req/s across ~1,500 requests with zero 429s, so 0.35 s is comfortably
  polite.
- **Backoff** on `429`/`5xx`: `2 ** attempt` seconds, 4 attempts max, honouring
  `Retry-After` when present. Abort the run after 10 consecutive failures. Note upstream
  sends **no** `Retry-After` and **no** `X-RateLimit-*` at any observed rate
  (`98` §6) — the handling is defensive, not observed.
- **Timeout** `AZORESBUS_SYNC_TIMEOUT` (default `20`).
- **Identify ourselves.** `User-Agent: SaoMiguelBus/3.x (+https://saomiguelbus.com; contact@…)`.
  Cheap, and it makes us allowlistable rather than anonymous.
- **Budget cap** `AZORESBUS_SYNC_MAX_REQUESTS` — **default `4000`**, raised from the
  2026-08-13 draft's 2000, which the ~2 150-request sampling sync would trip halfway
  through and leave a half-written network ([01 §9](01-upstream-api-reference.md)).
  Hitting the cap must mark the run `partial` and **suppress the prune**.
- **Resumable** — see §4.4 for what "resume" can and cannot mean.

### 4.4 What `payload_hash` can and cannot do

> **Corrected.** The 2026-08-13 draft's step 5 ("fetch detail if the stored hash differs")
> **can never skip a fetch** (`98` §4 gap). The journey *listing* has no `shape` and no
> `circulations` ([01 §4](01-upstream-api-reference.md)); the hash is of the *detail*
> body, which you only have after `GET …/journeys/{id}`.

So:

- **`payload_hash` skips DB writes, not GETs.** Fetch the detail, hash it, and if it
  matches, skip the `StopTime` rebuild. That is a real saving — ~1 200 detail bodies
  producing ~40 000 stop-time rows — but it is a **write** saving, and the request budget
  in [01 §9](01-upstream-api-reference.md) already assumes every detail is fetched.
- **If you want to skip GETs**, you need a per-journey signal that changes when the detail
  changes and is knowable without the detail: an upstream `ETag`/`Last-Modified` on the
  detail URL (unverified — check before relying on it), or a listing-derived fingerprint
  proven to move with the detail (`start`, `end`, `direction` — necessary but not
  sufficient; a re-timed intermediate stop would not move it). Do not assume; measure,
  and if neither holds, keep fetching.
- **"Resume" needs staged bodies.** `SyncRun.stats` checkpoints tell you *where* you
  stopped, not what you downloaded. `--resume` can skip re-fetching only if response
  bodies were staged to disk or a table. Otherwise `--resume` restarts the current phase.
  Say which one is implemented; do not imply the stronger one.

### 4.5 Prune safety

> **New.** The 2026-08-13 draft pruned everything absent from the run, inside one
> transaction. **A 200 with a partial list looks exactly like a deletion** (`98` §4 gap).

The prune runs only if **all** of these hold:

1. The run status is `completed`, not `partial`. Any budget-cap hit, abort, or consecutive
   failure suppresses the prune.
2. `journey_count` for this run is **≥ (1 − X) ×** the last successful run's
   `journey_count`. `AZORESBUS_SYNC_PRUNE_FLOOR` default `X = 0.10`. A larger drop marks
   the run `partial`, keeps the data, and alerts.
3. **No season sample came back empty.** If the near week returned zero journeys network-
   wide, that is an upstream problem, not a network deletion. Same for the far week on a
   full run.
4. **A far-season observation set exists** (§4.1) and the prune is scoped to
   `dataset='azoresbus'` **and** to journeys whose service window overlaps the dates this
   run actually sampled. A journey observed only in the season this run did not fetch is
   **not evidence of deletion** — this is the specific way the term/summer split can
   silently delete half the network, and it is the reason the far week is cached rather
   than dropped. An incremental run prunes only within the near season's window; a
   network-wide prune requires a full run.

The floor is deliberately a *ratio against the last successful run*, not an absolute
number, because the network legitimately changes size across the term boundary (307:
33 ↔ 38).

### 4.6 Scheduling

**Weekly cron as primary**, via the established `django_celery_beat` + migration pattern
(`minibus/migrations/0006_periodic_task_harvest_route_shapes.py`):

```python
# azoresbus/migrations/0002_periodic_tasks.py
'azoresbus.sync_schedules'  → crontab(hour=3, minute=30, day_of_week=0)   # Sunday 03:30
'azoresbus.sync_tariffs'    → crontab(hour=4, minute=0)                   # daily, 1 request
```

Tariffs are a single 32 KB request with `ETag`/`Last-Modified` — run daily conditionally;
it costs nothing when unchanged.

**Plus a lazy staleness backstop, not instead of it:**

```python
# in the search path — non-blocking, never delays a response
if last_successful_sync_age() > timedelta(days=SYNC_STALE_DAYS):   # default 10
    sync_schedules_task.apply_async(countdown=0)   # idempotent, lock-guarded
```

Guard with a Redis lock (`azoresbus:sync:lock`, TTL 45 min — the sampling sync is longer
than the 2026-08-13 estimate) so concurrent searches enqueue exactly one run.

**Raise the cadence for late August.** Upstream is demonstrably still loading data —
2026-07-25 empty, 2026-07-27 populated (`98` **B1**). Run **daily from ~20 August to
~15 September**, then back to weekly.

**Daily runs are incremental, not full** (§4.1). Near week + holidays + sentinels ≈ 1 150
requests / ~7 min; the far week is reused from `ServiceObservation`. A full run once a
week (and on any sentinel change) keeps the season contrast fresh. Without this split,
four weeks of daily full runs is ~60 000 requests against a host that publishes no rate
limit and gave us no `Retry-After` to calibrate against (`98` §6) — the fastest way to
turn a polite integration into a blocked one, right before the deadline.

**14 September deserves a full run regardless of cadence.** It is the one date where the
near season changes underneath us; schedule a full run for 14–15 September explicitly
rather than relying on the weekly slot landing well.

**Add a term-boundary probe** (§4.1): every run extends the forward sample and compares
sentinel lines. This is what catches term end without a published calendar.

### 4.7 Management command

```bash
python manage.py sync_azoresbus [--island sao-miguel] [--dry-run] [--force]
                                [--only stops|routes|journeys|calendar|tariffs]
                                [--dates 2026-09-14..2026-09-20,2027-07-06..2027-07-12]
                                [--no-prune] [--resume]
                                [--delay 0.35] [--max-requests 4000]
```

`--dry-run` reports the diff without writing — the thing you actually want on the morning
of 1 September. `--dates` makes the sample explicit and reproducible, which matters
because a run's correctness now depends on *which dates it sampled*. `--no-prune` is the
safe default for any run with a non-standard sample.

### 4.8 Transactionality

Wrap the upsert in `transaction.atomic()` and `suppress_revision_bumps()`
(`transit/services/offline_bundle.py`) so ~1 200 trip writes do not each bump the
revision; issue one `bump_data_revision()` at the end. This pattern already exists for the
legacy import — follow it exactly.

Never delete-then-recreate: a failed sync would leave the app with no timetables. Upsert,
then prune what this run did not see — **subject to §4.5** — inside the same transaction.

---

## 5. Gateway

Reuse the **existing Tailscale Pi proxy** built for PDL Mini Bus
(`src/minibus/docs/tailscale-tracking-proxy.md`). Cloudflare already blocks Hetzner egress
on `pdl.elevensystems.pt`, and **`azb` is behind Cloudflare too** (`server: cloudflare`,
`cf-ray …-LIS`). The review's probe reached it with a 200, but that probe egressed via
LIS, not from our infrastructure — **whether Hetzner is 403 on `azb` is untested**
(`98` §7). Route through the Pi from day one rather than finding out on 1 September.

The Pi currently forwards **`/publicapi/*` only** (`tailscale-tracking-proxy.md:60`). It
needs a second mapping — note the **different path prefix**:

```
/azb/*  →  https://azb.elevensystems.pt/api/*
```

> **This is real ops work, not a config toggle** (`98` §5 challenge 5). Schedule it in
> week 1, before the first cron run, and verify it with a single `GET /azb/routes`.

New env vars, mirroring the minibus naming:

```env
AZORESBUS_API_BASE_URL=http://100.x.y.z:8080/azb      # Pi proxy; direct URL as fallback
AZORESBUS_TRACKING_BASE_URL=http://100.x.y.z:8080/azb # same host, separate knob
AZORESBUS_PROXY_KEY=<same secret as MINIBUS_TRACKING_PROXY_KEY>
AZORESBUS_SYNC_DELAY=0.35
AZORESBUS_SYNC_TIMEOUT=20
AZORESBUS_SYNC_MAX_REQUESTS=4000
AZORESBUS_SYNC_PRUNE_FLOOR=0.10
AZORESBUS_TRACKING_CACHE_TTL=10
AZORESBUS_TRACKING_STALE_GRACE=60
```

Keep sync and tracking on separate base-URL vars: very different traffic shapes (a
13-minute weekly burst vs 10-second polling) and you will want to point them at different
egress independently.

Sending `X-Tracking-Proxy-Key` is handled the same way as
`minibus/tracking_client.py:_tracking_headers()`.

**Tariffs need the proxy too, for a different reason:** `azoresbus.pt` sends no
`Access-Control-Allow-Origin` ([01 §7](01-upstream-api-reference.md)), so the webapp
cannot fetch `tariffs.json` directly — it must come through our API.

---

## 6. Tariffs and the public pricing page

### Storage — keep it schemaless

All 148 `fareUnits` values are human-readable band labels (`"0 a 5"`, `"6 a 7"`, `"8"`),
and the category/group/tariff nesting is the operator's editorial structure, which will
change without warning ([01 §7](01-upstream-api-reference.md)). Parsing that into
relational tables buys nothing and breaks on the first restructure.

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

Snapshots are **append-only** — one row per distinct `content_hash`. Fare history for
free, and it lets the app show "prices updated on X".

Both freshness signals are real upstream data, not invented: `effective_date` from the
payload's `date` field, `upstream_modified_at` from the `Last-Modified` header
(`Wed, 05 Aug 2026 13:47:25 GMT` at last probe).

### Endpoint

```
GET /api/v3/transit/tariffs
```

```jsonc
{
  "effectiveDate": "2026-09-01",
  "lastUpdatedAt": "2026-08-05T13:47:25Z",
  "fetchedAt": "2026-08-14T04:00:11Z",
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

> **Tables only.** `fareUnitType: "km"` bands cannot be turned into a per-ride price:
> nothing upstream gives kilometres between two stops (`98` §4 gap "Fare distance").
> The endpoint returns the operator's tables verbatim; it never computes a fare, and no
> caller should present one. Deriving distance from the encoded shapes is separate work,
> explicitly out of scope ([00 Product cuts](00-overview-and-decisions.md)).

### The page itself

Server-rendered public page at `/precos` (pt) / `/prices` (en), in the existing
`legal`/`landing_page` template style, reading the same serializer. This satisfies "a new
public pricing page" for web/SEO; the in-app screen is in
[03 §6](03-mobile-plan.md).

---

## 7. Search, bootstrap, and the offline bundles

### 7.0 Dataset isolation sweep — **every** reader, not just search (`98` **B4**)

> **New section.** The 2026-08-13 draft named `search_routes` and `transit_stops_view`.
> Everything below also reads `Trip`/`Stop`/`Line` unfiltered and will mix networks the
> moment AzoresBus rows exist. Landing the sync before this sweep is the fastest way to
> break production.

| Path | File:line | Without a `dataset` filter |
|------|-----------|----------------------------|
| `GET /api/v2/webapp/load` | `compat/api.py:49` → `compat.py:119` `Trip.objects.filter(source=…)` | The **Expo offline fallback** (`lib/offline-bundle.ts:133`) and any leftover PWA download **both networks**. Must stay single-dataset — it is the fallback target for **any** v3 error (`98` **B3**) |
| `GET /api/v2/route` | `compat/api.py:84` `search_routes(...)` | Mixes unless search is filtered |
| `GET /api/v2/route?all=` | `compat/api.py:65` | Mixes independently of search |
| `GET /api/v3/transit/offline-bundle` | `offline_bundle.py:87–105` | Counts and emits **all** stops and trips — see §7.3/§7.4 |
| `GET /api/v3/transit/lines/{code}` | `transit/services/v3.py:88` `Line.objects.get(code=line_code)` | **`MultipleObjectsReturned`** as soon as line `101` exists in both datasets. Legacy already has `101` |
| `GET /api/v3/transit/trips/{id}` | `transit/services/v3.py:80` | OK while PKs do not collide; votes (`transit/api_v3.py:248`) the same. Still add the filter for defence |
| Directions stop resolve | `directions_v3.py:87`, `gmaps.py:53` `Stop.objects.filter(name__iexact=…).first()` | Arbitrary network's coordinates |
| **Directions cache key** | `directions_cache.py:14–36` | Hashes island/origin/destination/day/start/locale/arrival only, **TTL 24 h** — preview and live share a cached Google result. **Add `dataset` to `build_cache_key`** |
| Route weather | `route_weather.py:19` | Same `.first()` problem |
| Ads targeting | `ads.py:35` `Stop.objects.all()` | Mixed stop names in targeting |
| Ads stop groups | `ads.py:48,53` `StopGroup.objects.all()` | `StopGroup` is name-keyed with no dataset — AzoresBus names miss every group, or collide with a legacy one (§3.8) |
| Atlas importer | `atlas/importers/transit.py:16` keyed by `cleaned_name`, upsert in `atlas/importers/base.py` | The same POI overwritten across datasets |
| Trails nearest stop | `trails/services.py:540` | Mixed |
| Admin | `transit/admin.py` Line/Trip/Stop changelists | Unusable without a `dataset` column + list filter |
| Legacy import / parity | `legacy_import.py:617+`, `validate_legacy_parity.py:33` | §3.6 |

**Acceptance for this sweep:** a grep for `Trip.objects`, `Stop.objects`, `Line.objects`
outside `azoresbus/` returns no unfiltered call site, or each one carries a comment
saying why it is dataset-agnostic. Add a test that inserts one AzoresBus `Line` with code
`101` alongside the legacy `101` and asserts every endpoint above still returns exactly
one network.

**The new webapp** (`SaoMiguelBus-webapp/src/lib/api.ts:77–99`) calls
`/api/v3/transit/stops` and `/search` with **no `dataset` param**. That is *correct* — it
inherits server date resolution — but only if this sweep is complete. Its missing preview
toggle and cutover banner are a deferred **UX** decision; isolation is not deferrable
(`98` **B4**).

### 7.1 Date-resolved search

```python
# transit/services/schedule_phase.py  (new)
def resolve_dataset(island, *, requested: str | None, on_date: date) -> str:
    """Explicit request wins; otherwise the Atlantic/Azores date decides."""
    if requested in (DATASET_LEGACY, DATASET_AZORESBUS):
        return requested
    return DATASET_AZORESBUS if on_date >= cutover_date(island) else DATASET_LEGACY

def schedule_phase(island, on_date) -> str:      # preview | live | settled
    ...
```

Flags live in `Island.feature_flags`, editable in admin — no deploy to change the date:

```jsonc
"azoresbus": {
  "cutoverAt":         "2026-09-01T00:00:00+00:00",   // Azores midnight, as an INSTANT
  "bannerUntil":       "2026-10-01T00:00:00+00:00",
  "previewEnabled":    true,
  "trackingEnabled":   false,
  "observedTermStart": "2026-09-14"                    // OBSERVED, not official (98 §7)
}
```

All date logic runs in `Atlantic/Azores`. `cutoverAt` is stored and served as an
**instant**, not a calendar date, because the client compares instants
([00 Decision 1](00-overview-and-decisions.md)).

Then in `search_routes()` (`transit/services/search.py:92`):

```python
Trip.objects.filter(source=Trip.SOURCE_OPERATOR, line__disabled=False, dataset=dataset)
```

…and the calendar filter changes from `calendar__service_type=service_type` to the
date-eligibility predicate from §3.3, evaluated against the **requested ISO date**.

`transit_search_view` reads `?dataset=` and passes it through `resolve_dataset()`.
`transit_stops_view` gets the same treatment. **`?dataset=` is preview/admin only** — the
app must never populate it from a cached bootstrap value, and must never send
`dataset=legacy` on a public URL (`98` §4 gap "Stale bootstrap").

**Regression guard, restated honestly.** The 2026-08-13 draft promised "identical results
to today". **There is no 'identical to today' after the boarding-time filter change**
(§3.4) — and there are **no `search_routes` tests at all** today; `src/transit/tests/`
covers ads, directions, offline bundle and weather only (`98` §4 gap). So:

1. **Snapshot current behaviour first**, before touching the matcher — a fixture-driven
   record of what `search_routes` returns today.
2. Then assert the *only* differences after the rewrite are (a) trips previously dropped
   by first-occurrence matching now returned, and (b) trips previously dropped by the
   first-stop-time filter now returned when the **board** stop qualifies.
3. Then add date-eligibility and sequence tests on top.

### 7.1b Boarding-pole and sequence data in the search response

Each result gains the physical stop for boarding and alighting **and the sequence indices
the server chose** — the latter is what stops the client re-matching by name (`98` **B7**):

```jsonc
{ "id": 4211, "route": "101", "start": "07h15", "end": "08h05",
  "boarding":  { "code": "1002", "lat": 37.737628, "lon": -25.67039,
                 "sequence": 40, "dayOffset": 0 },
  "alighting": { "code": "5186", "lat": 37.825211, "lon": -25.497905,
                 "sequence": 59, "dayOffset": 0 },
  "headsign":  "RIBEIRINHA (CASA DO POVO)",
  "direction": 0 }
```

`code` is the number printed on the physical pole — the most useful single piece of
disambiguation for a user standing on a street with a stop on each side. `sequence` is
**load-bearing**, not decorative: [03 §5c](03-mobile-plan.md) requires
`extractTripSegment` to slice on these indices.

`dayOffset` travels with them so a client can render a `+1` day badge on night routes
without re-deriving the wrap (§4.2).

Keep these keys **additive and optional**. Legacy-dataset results have no `external_stop`
and omit `boarding`/`alighting`; older clients ignore them.

### 7.2 Bootstrap

`tenancy/bootstrap.py:serialize_bootstrap()` gains the `transitSchedule` block from
[00 Decision 1](00-overview-and-decisions.md), plus `trackingEnabled`. Banner and badge
copy live in `Island.feature_flags` as `{pt, en, …}` maps so they are editable per locale
without a release.

> **This is new serialization work.** Bootstrap today emits modules plus `maps`/`version`
> and does **not** pass arbitrary nested `feature_flags` through
> (`tenancy/bootstrap.py:33–75`, `98` §6). Budget for it; it is not a one-line flag.

Two fields exist specifically to defuse the stale-cache problem (`98` §4 gap):
`cutoverAt` as an instant, and **`nextTransitionAt`** — the instant at which this block
stops being true. The app is persisted for 24 h and `useBootstrapCached` never refetches,
so without `nextTransitionAt` it has no way to know when to invalidate.

### 7.3 The **current** offline bundle stays single-network

> **This replaces the 2026-08-13 §7.3 "`build_offline_bundle()` emits both datasets".**
> Doing that would hand every already-installed client both networks interleaved, because
> `offlineSearch` has no `dataset` concept and matches every row
> (`lib/offline-bundle.ts:203–226`, `98` **B3**).

`GET /api/v3/transit/offline-bundle` keeps **exactly** its current contract:

- **One** date-resolved network — whichever dataset `resolve_dataset()` returns at build
  time, filtered (`offline_bundle.py:87–105` currently counts and emits **all** stops and
  trips: that is the B4 fix).
- The existing row shape, including `weekday`. AzoresBus services are **projected** onto
  the legacy day-types for this endpoint: a trip is included under `WEEKDAY` if its
  service pattern runs on any Mon–Fri **within the currently effective window**, and so on.
- **That projection is lossy and must be documented as such**: a client on this endpoint
  cannot see that line 112 is Tuesday/Thursday only, and will not see the school-term
  flip until it re-downloads. Its correctness therefore depends on the bundle being
  rebuilt at the term boundary — see the fingerprint change below.

`compute_bundle_version()` (`offline_bundle.py:79–90`) currently hashes
`island.key:revision:stops_count:routes_count`. Extend the string with:

- per-dataset stop and trip counts,
- the cutover instant,
- **the identifier of the currently effective service window** (e.g. `term-2026-09-14`),

or a phase change and a term flip will not invalidate a cached bundle (`98` §6). Schedule
a `bump_data_revision()` at each known service-window boundary so the projection refreshes
even when no rows changed.

`/api/v2/webapp/load` (`compat/api.py:49` → `compat.py:119`) gets the same single-dataset
treatment. It is the fallback target for **any** v3 error, not just a 404
(`lib/offline-bundle.ts:174–176`), so it must never carry two networks.

### 7.4 New endpoint: schema-versioned bundle

```
GET /api/v3/transit/offline-bundle/v2        # full payload
GET /api/v3/transit/offline-bundle/v2/version # fingerprint only, for the staleness probe
```

Only builds carrying [03](03-mobile-plan.md) request it. Payload sketch:

```jsonc
{
  "schema": 2,
  "version": "…",                                  // includes dataset counts + cutover + window
  "generatedAt": "2026-08-20T03:41:09Z",
  "island": "sao-miguel",
  "dataset": "azoresbus",                          // ONE network per bundle (00 Decision 4)
  "cutoverAt": "2026-09-01T00:00:00+00:00",        // INSTANT
  "nextTransitionAt": "2026-10-01T00:00:00+00:00",
  "schedule": { /* the transitSchedule block, cached for offline banner rendering */ },
  "holidays": [ { "date": "2026-12-08", "name": "…" } ],
  "stops":   [ { "id": 1, "name": "…", "lat": 0, "lon": 0 } ],
  "services": {
    "svc_a1b2": { "days": "1111100",                // Mon…Sun bitstring
                  "from": "2026-09-14", "to": null,
                  "added": [], "removed": [] }
  },
  "routes": [
    { "id": 4211, "line": "112",
      "service": "svc_a1b2",
      "stops":  [ 12, 44, 91 ],                    // indices into `stops`
      "codes":  [ "1002", "1044", "5186" ],        // pole code per position
      "times":  [ 26100, 26400, 27600 ],           // seconds since midnight
      "offsets":[ 0, 0, 0 ] }                      // day_offset per position
  ]
}
```

Design notes, each tied to a finding:

- **`services` replaces `weekday`.** The client resolves eligibility for an **ISO date**
  using the same rule as §3.3, holiday→Sunday included (that is what `holidays` is for).
  A `WEEKDAY|SAT|SUN` enum cannot represent line 112 or the 307 seasonal flip
  (`98` **B0**).
- **`dataset` is a bundle-level field, not a per-row one** (decided 2026-08-14,
  [00 Decision 4](00-overview-and-decisions.md)). The bundle carries the single
  server-resolved network; the client uses `dataset` + `cutoverAt` only to detect that a
  pre-cutover bundle has **expired** ([03 §5.2](03-mobile-plan.md)), never to filter rows.
  Old clients never see this payload, so the mixing failure in `98` **B3** cannot occur
  either way — but shipping one network halves an unmeasured payload against a shared
  6 MB budget and deletes a whole branch of client logic.
- **`holidays` must span the dates the `services` rules cover.** Emitting
  `Holiday.objects.all()` ships a list ending in 2025 against production data as of
  2026-08-14 ([00 prerequisite](00-overview-and-decisions.md)), which breaks the client's
  holiday→Sunday branch for every date that matters.
- **`offsets`** carries the night wrap (§4.2) so offline ordering matches the server's.
- **`codes`** lets offline results show the boarding pole (~5 bytes per stop, cheap next
  to the names already there).
- **Stop-index references and integer times** instead of repeated name strings — the size
  mitigation the 2026-08-13 draft listed, now the default rather than a "consider".

**Size — measure, do not estimate.** The 2026-08-13 "~1.3 MB" was arithmetic over 895
journeys; the real figures moved (**989** journeys in a term week) and, more importantly,
`serialize_stops_v3` **duplicates short-name aliases** (`transit/services/v3.py:13–15` →
`compat.py:12–39`), so the on-wire stop count exceeds the collapsed 816 before dual
datasets are considered (`98` §4 gap). Local `transit_*` tables are **empty**, so nothing
has been measured yet (`98` §7). **Run a real import, then measure**, before shipping to
Premium users on mobile data. Note that wire gzip does not solve the client-side problem:
`fetch().json()` decompresses before the client stores anything.

---

## 8. Live tracking — gateway and endpoints only, map deferred

Mirror `minibus/`; the payloads are the same vendor's
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

**Serializer note:** list and detail are **different key sets**
([01 §6](01-upstream-api-reference.md)). List is `color, id, position, status`; detail is
the nine keys `currentStopSequence, fleetId, id, journey, licensePlate, position, route,
speed, status` — with **no top-level `color`**; colour lives on `detail.route.color`
(`98` claim 14). Do not write one serializer that assumes the union.

**The flag gate:** when `feature_flags['azoresbus']['trackingEnabled']` is false, the
endpoints return `503` with `{"error": {"code": "tracking_disabled"}}` and bootstrap
reports `trackingEnabled: false`.

**Empty fleet is not an error.** `[]` means "no buses reporting" — the correct answer at
03:00 and the correct answer today. Three distinct states: `tracking_disabled`, empty
fleet, upstream failure.

Map `id` → our data via `ExternalJourney.external_id` / `ExternalStop.external_id`, so a
tracked vehicle can be joined to a `Trip` and its `currentStopSequence` resolved to a real
stop.

> **Scope trim (`98` §5 challenge 6).** Ship the client, cache layer, endpoints and flag
> in week 3. **Do not build the map UI** until `/api/locations` is non-empty or preview
> has shipped. The fleet is `[]` today; a second full copy of the `features/minibus/`
> surface, reviewed against nothing, is opportunity cost against a hard August deadline
> ([03 §7](03-mobile-plan.md)).

---

## 9. Testing

> **Baseline reality:** there are **no `transit` search tests** today — `src/transit/tests/`
> covers ads, directions, offline bundle and weather (`98` §4 gap). Every row below is new.

| Area | Test |
|------|------|
| **Snapshot first** | Record `search_routes` output on fixtures **before** the matcher rewrite. This is the baseline; there is no "identical to today" afterwards (§7.1) |
| **Dataset isolation** | Insert AzoresBus `Line(code='101')` beside legacy `101`; assert v2 load, `?all`, v2 route, v3 search, v3 stops, `get_line_v3`, directions, weather, ads, trails each return exactly one network. `get_line_v3` must not raise `MultipleObjectsReturned` (`98` **B4**) |
| **Directions cache** | Same origin/destination/day/start/locale under two datasets → two cache keys (`98` §4 gap) |
| **Legacy import re-run** | Import legacy twice with AzoresBus rows present → AzoresBus `Stop`/`Line` untouched; parity command passes (`98` **B8**) |
| **Service calendar — weekday** | Fixture from the 2026-09-14…20 sweep: line 112 returns results on Tue/Thu and **nothing** Mon/Wed/Fri; 102's Wed extra `1009` and Fri extra `1011` are distinct trips (`98` **B0**) |
| **Service calendar — season** | Line 307 → 38 journeys on 2026-09-14 and 2027-01-11, **33** on 2026-09-02 and 2027-07-12 |
| **Holiday resolution** | 2026-12-08 (a Tuesday) returns the **Sunday** set, and contributes **no** Tuesday evidence to pattern derivation (`98` **B6**) |
| **Empty holiday table** | With **no** `Holiday` rows for the sampled year, the run **hard-fails** instead of deriving patterns. Regression test for the production state found 2026-08-14: 16 rows, newest 2025-06-19 ([00 prerequisite](00-overview-and-decisions.md)) |
| **Holiday seed** | The 2026–2027 seed contains all 8 dates `98` confirmed: 2026-08-15, 10-05, 12-01, 12-08, 12-25, 2027-01-01, 04-04, 06-10 |
| **Holiday detection** | A sampled weekday whose journey set equals the route's Sunday set and differs from its other weekdays is recorded as a `ServiceException`, **even when absent from the `Holiday` table** |
| **Bundle holidays** | Both bundle endpoints emit holidays covering the dates their `services` rules span — not `Holiday.objects.all()` truncated at 2025 (`offline_bundle.py:97`, `compat.py:105`) |
| **Derivation honesty** | A journey seen on 2 of 3 sampled Tuesdays lands in `stats['ambiguous']` and does **not** silently set the Tuesday bit (§3.3) |
| **Term bracket** | Observed flip between 09-11 and 09-14 stores `start_date=2026-09-14` (conservative end of the bracket) and flags `confidence='sampled'` |
| Date resolution | Frozen clock at 2026-08-31T23:59 and 2026-09-01T00:01 (`Atlantic/Azores`) → legacy then azoresbus |
| Explicit override | `?dataset=azoresbus` in August returns the new network; `?dataset=legacy` is never produced by the app |
| **Sampling guards** | Sampler refuses a holiday weekday as weekday evidence; refuses dates before 2026-07-27; a run with `--dates` outside a season sets `--no-prune` semantics |
| **Prune floor** | Journey count 15 % below the last successful run → run marked `partial`, **nothing pruned**, alert raised. Empty season sample → no prune (§4.5) |
| **Prune scope** | A journey observed only in the summer sample is not pruned by a term-only run |
| **Tiered sample** | An incremental run with **no** stored far-season observations upgrades itself to a full run; with them, it issues ~1 150 requests, not ~2 150, and prunes only within the near season's window (§4.1) |
| **Season swap** | Advancing the clock across the term boundary makes the previously-near week the cached far week and forces a fresh near-week fetch |
| Sync idempotency | Run twice against fixtures → second run writes nothing new; assert the **detail GET count is unchanged** (the hash saves writes, not requests — §4.4) |
| **Night wrap** | N03 journey `984` fixture: seq 42 `86341` → seq 43 `0` → seq 47 `600` yields `day_offset` 0,1,1 and stop order preserved. Assert **no** code path sorts by `departure_time` alone (`98` **B2**) |
| **Not-a-wrap** | N02's separate `startTime: 0` journey stays a distinct trip with `day_offset` 0 throughout |
| Rate limiter | Fake 429 with `Retry-After` → honoured; consecutive failures abort; budget cap marks `partial` and suppresses prune |
| Stop collapse | 1456 fixtures → 816 stops; **14** groups flagged > 75 m; `CAPELAS (LG. TEATRO NOVO)` (1268/1270, 18.4 m) collapses without a "non-consecutive" error |
| **Loop routes** | **301 (loop) and 335 (36 repeated names, not a loop): `C → A` where `A` is also stop 1 returns the trip, boarding at the later sequence.** Tie-break is elapsed duration, **not** stop count |
| **Cross-language contract** | The **same** 335/301 fixture files drive the Python matcher test and the TypeScript `extractTripSegment` test; assert identical `(boarding.sequence, alighting.sequence)` (`98` **B7**, [03 §9](03-mobile-plan.md)) |
| **Board-time filter** | A loop trip that started at 06:00 and reaches the origin at 09:00 is returned for `start=08h30` (today it is dropped — `search.py:113–118`) |
| Boarding pole | Both directions of route 101 → `boarding.code` differs per direction (`1002` vs `1001`) |
| Pole on legacy | Legacy-dataset result omits `boarding`/`alighting` rather than emitting nulls |
| **Bundle v1 isolation** | The current `/offline-bundle` and `/api/v2/webapp/load` emit **one** dataset with AzoresBus rows present (`98` **B3**) |
| **Bundle v2 services** | The v2 payload's `services` table resolves line 112 to Tue/Thu and 307 to 38-in-term / 33-in-summer for a given ISO date |
| Bundle version | Cutover change **and** a service-window change each produce a new fingerprint |
| `isActive` | A fixture with `isActive: false` on 328 still imports its 4 weekend journeys (`98` **B5**) |
| Tariffs | Same `content_hash` twice → one snapshot row; changed payload → new row, old `is_current=False`; `fareUnits` round-trips as a **string** |
| Tracking flag | Flag off → `503 tracking_disabled`; flag on + empty upstream → `200 []`; list vs detail serializers assert their own key sets |
| Timezone | All date logic in `Atlantic/Azores`; `cutoverAt` compared as an instant |

**Fixtures.** Capture real upstream responses and commit under `azoresbus/tests/fixtures/`:
route `101` (small), `301`/route id 25 (loop, 17 weekday journeys), `307`/route id 31
(**the seasonal case — capture both a term date and a summer date**), `112`/route id 9
(Tue/Thu only), `335` (36 repeating names), and `N03` journey `984` (the wrap). **Never
hit the network in tests.** The review already paid the request cost for these dates;
reuse its captures rather than re-probing (`98` §1).

---

## 10. Rollout

1. Ship schema (`dataset`, `ServicePattern`, `ServiceException`, `day_offset`) **plus the
   §7.0 isolation sweep and the §3.6 legacy pinning**. No client impact — nothing reads
   `dataset` yet, and nothing has written an AzoresBus row.
2. Land the Pi `/azb` mapping and verify with one `GET /azb/routes` (§5).
3. Run `sync_azoresbus --dry-run --no-prune`, inspect the diff. Then a real run with an
   explicit `--dates` term+summer sample. Verify 55 lines, ~989 term-week trips, 816
   collapsed stops under `dataset='azoresbus'`, and **14** stop groups flagged > 75 m.
4. **Measure the real bundle payload** now that `transit_*` is populated (§7.4).
5. Ship `transitSchedule` in bootstrap with `previewEnabled: false`. App-side work lands
   feature-detected and dormant.
6. Ship the v2 bundle endpoint. The current endpoint's contract is unchanged.
7. Flip `previewEnabled: true` → preview phase begins.
8. **1 September:** nothing to deploy. `resolve_dataset()` flips at Azores midnight.
9. **~14 September:** verify the term sample. This is the one date in the whole rollout
   where the *data*, not the code, changes underneath us — 307 should go 33 → 38, and
   112/321/324/325 should appear. If they do not, the observed term start was wrong.
10. **1 October:** nothing to deploy. `bannerUntil` passes, banner retires.
11. Whenever the fleet reports: flip `trackingEnabled`, then build the map UI.

Steps 8 and 10 requiring no deploy is the whole point — verify both by moving `cutoverAt`
on staging and watching an **unmodified** app build follow.

**Alerts** on `SyncRun`:

- no successful `schedules` run in 10 days → page. Silent sync failure is the
  highest-likelihood way this goes wrong.
- run marked `partial`, or a prune suppressed by the floor → notify.
- a sentinel line's journey set changes against the stored pattern → notify (this is the
  term-boundary detector, §4.6).
- `id → (start, end, route)` churn above a threshold → notify (republish detector, §3.5).
