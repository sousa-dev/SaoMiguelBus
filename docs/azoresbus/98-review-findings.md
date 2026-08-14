---
title: "AzoresBus plan review — adversarial findings"
status: review
date: 2026-08-14
reviewed: docs/azoresbus/{README,00,01,02,03}
method: live serial GET against azb.elevensystems.pt + azoresbus.pt (≥0.35 s apart, 305 requests); source inspection of SaoMiguelBus-api, SaoMiguelBus, SaoMiguelBus-webapp
---

# AzoresBus changeover — review findings

## 1. Verdict

Do not start implementation from this plan set as written. The Calendar mapping (three day-types, holidays → Sunday) holds up under a 51-date seasonal sweep, and most of `01`’s payload-shape measurements are correct. But the load-bearing story in `00`/`01` §4.3 — that `?day=` already serves the *outgoing* network before 1 September and the *new* network after — is false. This API has no legacy timetable: dates before ~August 2026 return `[]`, and non-holiday August dates already return the same journey IDs as September. Combined with a wrong midnight-time encoding (`>86400` never happens; night routes wrap to `0…600`), an `isActive: false` weekend route that still has journeys, unfiltered `Trip`/`Stop`/`Line` queries that would mix networks, a dual-bundle that old clients would swallow whole, and a client `extractTripSegment` that would throw away the loop-route fix even after the server is patched — this is not a safe build spec. Fix the blockers below, then it is.

## 2. Blocking issues

### B1. Upstream does not serve a pre-cutover / post-cutover pair

`01` §4.3 and `00` Decision 3 claim the same endpoint returns the outgoing operator before 1 September and AzoresBus after, citing route 25 Sat 2026-08-15 (8 journeys, first 08:00) vs Sat 2026-09-05 (10, first 06:30). `01` L180–181: “Dates before the concession start return the outgoing operator's service.”

**That comparison is a holiday, not a cutover.** 2026-08-15 is Saturday *and* Assumption Day. Route id `25` is line **301**, and 08-15 returns the Sunday set (ids 515–522), identical to 2026-09-06.

Non-holiday Saturdays *before* 1 September already match September:

| Date | Weekday | Route 25 / line 301 | First | IDs |
|------|---------|---------------------|-------|-----|
| 2026-07-25 | Sat | `[]` | — | — |
| 2026-08-08 | Sat | 10 | 06:30 | 505–514 |
| 2026-08-15 | Sat+holiday | 8 | 08:00 | 515–522 (Sunday set) |
| 2026-08-22 | Sat | 10 | 06:30 | 505–514 |
| 2026-08-29 | Sat | 10 | 06:30 | 505–514 |
| 2026-09-05 | Sat | 10 | 06:30 | 505–514 |
| 2026-08-31 | Mon | 17 | 06:30 | 488–504 |
| 2026-09-01 | Tue | 17 (line 101) | 17:15 | 1–8 (same as 08-31) |

Command: `GET https://azb.elevensystems.pt/api/routes/25/journeys?day=2026-08-22` → 10 journeys, ids 505–514, first `06:30:00`. Same body size (1591 B) as `?day=2026-09-05`.

**Implication:** do not design a sync that pulls “legacy-period” rows from this host. Legacy stays the data already in `transit.*`. This API is AzoresBus-only; `?day=` selects the weekday/Sat/Sun pattern (and holidays), not the concession.

### B2. Night times wrap below 86400 — the planned `day_offset` converter will not fire

`02` §4.2 assumes `departureTime` can exceed 86400 and converts with `divmod(seconds, 86400)`. Sampled N01–N05 listing and detail payloads: **zero values > 86400**.

Past-midnight is encoded as wrap-to-zero on the same journey. N03 journey `984` (`GET /api/routes/53/journeys/984`):

- `start: 23:15:00`, `startTime: 83700`
- `end: 00:10:00`, `endTime: 600`
- circulations seq 42 max dep `86341`; seq 43 `RELVA (CANTO DA PIA)` dep `0`; seq 47 dep `600`

`StopTime` is a `TimeField` (`transit/models.py:114`). Storing `00:10` without a day offset, then ordering by time instead of `sequence`, reorders the trip. The field is still required; the conversion rule in the plan is wrong. Detect wrap when `departureTime` *decreases* along `sequence`, and assign `day_offset=1` from that point. Sort/search must use `(day_offset, time)` or `sequence`, never `TimeField` alone.

N02 also splits the night: a `00:00:00` journey (`startTime: 0`, `endTime: 3900`) sits next to `21:50` / `22:55` journeys. That is a second journey, not `86400+`.

### B3. Dual-dataset bundle will mix networks on any client that already downloads `/offline-bundle`

Current offline search has no `dataset` field and matches every row:

```203:226:lib/offline-bundle.ts
export function offlineSearch(
  bundle: OfflineBundle,
  params: {
    origin: string;
    destination: string;
    day: string;
  },
): TransitSearchResult[] {
  // ...
      const originIndex = stopKeys.indexOf(originKey);
      const destIndex = stopKeys.indexOf(destKey);
      if (originIndex < 0 || destIndex < 0 || originIndex >= destIndex) {
        return false;
      }
```

`00` L26–28 / README require cutover **without an app update**, including June installs and Premium offline across the night. That is two different populations:

| Client | Online on 1 Sep | Offline on 1 Sep |
|--------|-----------------|------------------|
| Build that contains `03` | server `resolve_dataset` | bundle `cutoverDate` (if downloaded) |
| Build in the wild today | server can still switch unversioned search | **impossible** — no `cutoverDate`, no dataset filter |

Worse: if the API starts emitting both datasets in the existing bundle shape before old clients are gone, `refreshOfflineBundle()` (`lib/offline-bundle.ts:157`) will persist the payload and `offlineSearch` will return **legacy and AzoresBus interleaved**. `absent ⇒ 'legacy'` only helps old *cached* bundles, not old *code* consuming a new bundle.

Must **not** change the current endpoint’s semantics. Optional `dataset` on existing rows is ignored by old code, which then searches every row. Ship `/api/v3/transit/offline-bundle/v2` (or equivalent schema version) that only new clients request. Keep today’s payload as one date-resolved network.

Also: `refreshOfflineBundle()` falls back to v2 on **any** v3 error, not just 404 (`lib/offline-bundle.ts:174–176`). A 5xx or a schema the parser chokes on still loads `/api/v2/webapp/load`. That path must stay single-dataset (B4).

Accept that pre-`03` installs only switch while online. Do not claim otherwise.

### B4. Unfiltered `Trip` / `Stop` / `Line` queries will mix networks as soon as AzoresBus rows exist

`02` §7.1 adds `dataset=` to `search_routes` (`transit/services/search.py:92`) and `transit_stops_view`. These paths do **not** filter today and are not listed in the plan:

| Path | File:line | What happens without `dataset` |
|------|-----------|--------------------------------|
| `GET /api/v2/webapp/load` | `compat/api.py:49` → `compat.py:119` `Trip.objects.filter(source=…)` | Expo fallback (`offline-bundle.ts:133`) and any leftover PWA load **both networks** |
| `GET /api/v2/route` | `compat/api.py:84` `search_routes(...)` | mixes if search is not filtered; still mixes `?all=` at `compat/api.py:65` |
| `GET /api/v3/transit/offline-bundle` | `offline_bundle.py:87–105` counts/emits **all** stops and trips | old clients, see B3 |
| `GET /api/v3/transit/lines/{code}` | `v3.py:88` `Line.objects.get(code=line_code)` | `MultipleObjectsReturned` once 101 exists in both datasets — legacy already has `101` (`legacy/src/db.sqlite3` `app_route`) |
| `GET /api/v3/transit/trips/{id}` | `v3.py:80` | OK if PKs don’t collide; votes (`api_v3.py:248`) same |
| Directions stop resolve | `directions_v3.py:87`, `gmaps.py:53` `Stop.objects.filter(name__iexact=…).first()` | arbitrary network’s coordinates |
| Route weather | `route_weather.py:19` | same |
| Ads targeting | `ads.py:35` `Stop.objects.all()` | mixed names |
| Atlas importer | `atlas/importers/transit.py:16` keyed by `cleaned_name` | same POI overwritten across datasets (`atlas/importers/base.py` upsert) |
| Trails nearest stop | `trails/services.py:540` | mixed |
| Admin | `transit/admin.py` Line/Trip/Stop changelists | unusable without a dataset column |
| Legacy import / parity | `legacy_import.py:617+`, `validate_legacy_parity.py:33` | see B8 |

`00` L199–201 declaring the webapp out of scope is only safe if **every** v3 *and* v2 reader is filtered. The new webapp (`SaoMiguelBus-webapp/src/lib/api.ts:77–99`) calls `/api/v3/transit/stops` and `/search` with **no** `dataset` param — it will follow server date-resolution if that lands on the shared `search_routes`/`stops` views, but it will also inherit any missed filter. It has no preview toggle. That is deferred UX, not silent mixing, **only if B4 is done**.

`unique_together ('island','code')` → `('island','dataset','code')` is required. Legacy `app_route.route` values `101,102,103,105,108,109,110,111,112,200,202,203,205,206,208,210,211,212,216,218,219,301,302,306,311,312,314–318,322,324,326,328` all exist as AzoresBus `nameShort`s. Local `src/db.sqlite3` has **zero** `transit_line` rows, so this is evidenced from the legacy SQLite, not from a live v3 import.

### B5. `isActive: false` is not “no service” — honouring it drops line 328 weekends

`GET /api/routes?active=true&passengerInfo=true` still returns 55 routes; 5 have `"isActive": false` (`112,321,324,325,328`). Omitting `?active=true` returns the same 55 (5878 B both URLs).

| Line | Route id | Unfiltered `/journeys` | Wed 09-02 | Sat 09-05 | Sun 09-06 | 2027-07-07 |
|------|----------|------------------------|-----------|-----------|-----------|------------|
| 112, 321, 324, 325 | 9, 41, 44, 45 | `[]` | 0 | 0 | 0 | 0 |
| **328** | 47 | `[]` (today is Friday) | 0 | **4** (ids 942–945, 13:10–17:30) | 4 | 0 |

Sync algorithm `02` §4.1 step 2 uses `?active=true` and never discusses `isActive`. If the worker skips `isActive: false`, 328’s weekend circuit disappears. If it includes them, 112/321/324/325 stay empty shells. Treat `isActive` as a display flag, not a journeys predicate; import journeys for every listed route.

Unfiltered `/journeys` (no `?day=`) is **today’s** set, not the catalogue. That is why 328 unfiltered is empty on a Friday and why 101 unfiltered is 8 weekday ids. The sync must keep using `?day=` on canonical **non-holiday** Wed/Sat/Sun.

### B6. Canonical sync dates that land on a holiday will poison WEEKDAY

`02` §4.1: “next Wednesday, next Saturday, next Sunday” after `max(today, cutover)`. 2026-12-01 (Tue, Restoration of Independence) and 2026-12-08 (Tue) both returned the Sunday set on every swept route. A “next Wednesday” that is a holiday would store Sunday journeys on `Calendar.WEEKDAY`.

Skip dates that upstream itself treats as Sunday (or skip against our `Holiday` table, which already matches for the holidays we probed). Do not prune against a holiday Wednesday.

### B7. Sequence matching is not end-to-end — the app will discard the server’s pair

Online search already runs every result through `processTransitResults` → `extractTripSegment` (`features/transit/hooks/useOfflineSearch.ts:75–81`, `lib/transit-results.ts:78–86`). That helper walks stops until the **first** origin, then the **first** destination after it, and **returns `null` if a destination name appears before origin is found**:

```172:199:lib/transit-format.ts
export function extractTripSegment(
  trip: TransitSearchResult,
  origin?: string,
  destination?: string,
): TransitSearchResult | null {
  // ...
    if (stopMatchesQuery(destQuery, stop.name)) {
      if (!foundOrigin) {
        return null;
      }
```

So the server can correctly pick 301’s later `C → A` (seq 40 → 59) and the client still drops the trip. The same first-occurrence logic lives in the legacy PWA (`SaoMiguelBus-webapp/legacy/js/offlineHandler.js:270–281`).

Required: search responses must include selected `boarding.sequence` / `alighting.sequence` (already sketched in `02` §7.1b) **and** `extractTripSegment` must honour those IDs, not re-match names. Tie-break: board timestamp, then elapsed duration (not stop count), then stable trip id. Contract-test Python and TypeScript against the same 335/301 fixtures.

Online search also fetches `start: '00h00'` always (`useOfflineSearch.ts:44`) and reorders in the client. The planned “earliest departure ≥ requested start” on the server is not what the app does today.

### B8. Re-running legacy import will corrupt or crash after AzoresBus exists

The importer is dataset-blind:

- `Stop.objects.update_or_create(island, cleaned_name)` — `legacy_import.py:617–625`
- `Line.objects.update_or_create(island, code)` — `:696–700`
- stop match `.filter(island, cleaned_name).first()` — `:742–745`

After uniqueness includes `dataset`, these raise `MultipleObjectsReturned` or update the AzoresBus row. `validate_legacy_parity.py:33–44` compares legacy counts to `Stop.objects.count()` / `Trip.objects.count()` with no dataset filter, so it fails permanently once AzoresBus rows exist. Pin every import/parity query to `dataset='legacy'`.

## 3. Corrections

Measured 2026-08-14. Probe log: 291 serial requests in `/tmp/azoresbus_review/` plus 14 follow-ups.

| # | Claim | Result |
|---|-------|--------|
| 1 | 1456 stops, 816 names, 630 pairs / 5 triples / 181 singletons | **Confirmed** (635 names with >1 code) |
| 2 | median 12 m, mean 17, max 164, 0 groups >250 m, 3 >100 m | **Close.** Median **11.5 m**, mean **16.5 m**, max **164.1 m**. 3 >100 m, 0 >250 m. **14 groups >75 m**, not the “30 groups today” in `02` §3.2 |
| 3 | 629/630 pairs consecutive integer codes | **Confirmed.** The one exception is `CAPELAS (LG. TEATRO NOVO)` codes `1268`/`1270`, **18.4 m** apart — still a road pair, skipped integer |
| 4 | 101: 24/27 names different code per direction; 102: 10/14 | **Confirmed** (both_ways 27/14, different_code 24/10) |
| 5 | lower number not consistent with direction | **Confirmed.** Route 101 dir 0 takes the lower code in 14/27 comparable names |
| 6 | 55 routes, 3 colours | **Confirmed** colours `1C4DA1/00A7E2/A5CE44`. **Omitted:** 5 of the 55 have `isActive: false` even with `?active=true` (see B5) |
| 7 | `day` only bound param; `?direction=abc` → 200 | **Confirmed.** `/api/routes/1/journeys?direction=abc` → 200, 8 journeys (today’s weekday set). `?day=abc` → 400 `errors.day` |
| 8 | weekday names → 400 | **Confirmed** for `Monday/monday/1/0/Sunday` |
| 9 | Route 25 Wed 17 ids 488–504; Sat 10 ids 505–514; Sun 8 ids 515–522 | **Confirmed.** Clarify: route **id** 25 is public line **301**, not “line 25” |
| 10 | listed holidays → Sunday set, no new IDs | **Confirmed** for 2026-10-05, 12-08, 12-25, 08-15, 2027-01-01 on route 25. Also 2026-12-01, 2027-04-04 (Easter), 2027-06-10 (Portugal Day) |
| 11 | Sep change: 08-15 Sat 8@08:00 vs 09-05 Sat 10@06:30 | **False as a cutover proof.** 08-15 is a holiday (B1). Non-holiday August Saturdays already match September |
| 12 | 13/50 routes revisit a name; 335 does it 37/97; 5 loops; 10 single-direction | **Mostly.** 335 weekday journey `950`: 97 stops, **36** distinct names that repeat, **37 extra visits**, not “37 repeated names”. Loops confirmed on 301/303/306/323/N03 (first name = last). 335 is **not** a loop (Alfândega → Forte S. Brás). Did not re-sweep all 50 routes |
| 13 | `/api/locations` → 200 `[]`; `/publicapi/locations` → 404; PDL live | **Confirmed.** PDL fleet n=10. `cf-ray` LIS on both hosts |
| 14 | PDL vehicle detail top-level keys | **Confirmed exact set:** `currentStopSequence, fleetId, id, journey, licensePlate, position, route, speed, status`. List endpoint keys are only `color,id,position,status` — the plan’s list example is the list shape, detail is the 9-key set |
| 15 | tariffs Last-Modified/ETag, date 2026-09-01, 4 categories, fareUnits text | **Confirmed.** 32066 B, `last-modified: Wed, 05 Aug 2026 13:47:25 GMT`, etag `"80d474f2e024dd1:0"`, categories as listed, `fareUnits` all strings (`"0 a 5"`, `"6 a 7"`, `"8"`, …) |
| 16 | journey `shape`; route detail `shape` + zeroed `stops[]` | **Confirmed.** Route 1: `shape` 844 chars, 74 stops, all `sequence`/`departureTime` 0 |
| 17 | listed endpoints 404 | **Confirmed** all 20 paths. `/api/stops/167` 404. No GTFS on `azoresbus.pt/gtfs`, `/gtfs.zip`, homepage (0 hits for “gtfs” / “dados abertos”). `/static/json/` directory listing is 403 |

**`01` L41 vs L34:** “635 names carry more than one stop code (630 pairs, 5 triples, 181 singletons)” — the 181 are the *singletons*, i.e. the 816−635. Arithmetic is consistent; the sentence is easy to misread.

**`02` §3.2 “30 groups >75 m”:** measured **14**. Worst three match the named stops (Covoada 164 m, Alfândega 134 m, Forte S. Brás 108 m). No same-name pair looks like two different places; all 14 far groups still have consecutive (or +2) pole codes.

**Unfiltered journey lists are not the full ID space.** `/api/routes/1/journeys` with no `day` returned 8 ids (1–8) on a Friday; Saturday adds 9–10. This is why 895 unique ≪ max id 1259: unused IDs, weekend IDs absent from a weekday fetch, and four routes with no journeys at all. Not a fourth calendar (see §7).

## 4. Gaps

- **No `transit` search tests.** `src/transit/tests/` has ads, directions, offline bundle, weather — nothing for `search_routes`. The “write back-compat first” test in `02` §9 does not exist today; adding `dataset` plus sequence matching will change results (today filters on the **trip’s first stop time**, `search.py:113–118`, not boarding time). That behaviour change is desirable but will fail a naïve “identical to today” snapshot unless the snapshot is taken *before* the matcher rewrite.
- **Holiday-aware canonical dates** — see B6.
- **Prune safety.** `02` §4.1 step 7 prunes trips absent from the run, inside one transaction. A 200 with a partial list (upstream deploy) still looks complete. Need a floor (e.g. abort prune if journey count drops >X% vs last successful `SyncRun`) and do not prune when any route’s three day-types all come back empty.
- **Stale bootstrap vs offline cutover.** Bootstrap is persisted 24 h (`lib/query-provider.tsx:28`) with `staleTime` 5 min on `useBootstrap` (`useTransitQueries.ts:27`). `useBootstrapCached` never refetches (`enabled: false`). App foreground only flushes analytics (`app/_layout.tsx:113–123`) — it does not invalidate bootstrap, stops, or search. `03` §1 says the hook reads bootstrap first, then the bundle. A cached `phase: preview` / `activeDataset: legacy` from 31 Aug, used offline on 1 Sep, will override `cutoverDate` if `activeDataset` is passed as `resolveOfflineDataset`’s `override`. Spec: override is **only** the preview toggle; never send `dataset=legacy` on the public search URL (`02` §7.1: explicit request wins forever). Add `nextTransitionAt` and invalidate at that instant.
- **Mid-session midnight.** Unversioned search is date-resolved per request (good). Search keys omit dataset and start (`useOfflineSearch.ts:31–36`; `useTransitQueries.ts:56`). Stops use a permanent `['transit', 'stops']` key. A screen left open across midnight on two weekdays (31 Aug / 1 Sep) can keep August results. The webapp is worse: `staleTime` 30 min, `gcTime` 24 h, **`refetchOnWindowFocus: false`** (`SaoMiguelBus-webapp/src/lib/queryClient.ts:3–11`).
- **Directions cache is dataset-blind.** `build_cache_key` (`directions_cache.py:14–36`) hashes origin/destination/day/start/locale only, TTL 24 h. Preview vs live, or post-cutover same stop names, can serve the other network’s Google result. Include `dataset`. Same for `directions_v3.py:87` / `gmaps.py:53` / `route_weather.py:19` `.first()` stop resolve.
- **`payload_hash` cannot skip detail fetches as written.** Journey *list* has no shape/circulations (`01` §4). The hash of the detail body is only known after `GET …/journeys/{id}`. `02` §4.1 step 5 (“fetch detail if stored hash differs”) will always miss. Use the hash only to skip DB writes, or persist ETag/summary fingerprints proven to change when detail changes. `SyncRun.stats` alone cannot resume skipped downloads unless bodies are staged.
- **`serialize_stops_v3` duplicates short-name aliases** (`v3.py:13–15` → `compat.py:12–39`). Bundle stop count will exceed the collapsed 816 even before dual-dataset. Measure the real payload; do not treat 816 as the on-wire size.
- **`get_line_v3` uniqueness** — see B4.
- **Webapp preview / banner.** New webapp will flip with the API and show no warning. Legacy PWA under `SaoMiguelBus-webapp/legacy/` still talks v2. Out of scope is a product deferral, not a technical isolation.
- **Fare distance.** `fareUnitType: "km"` bands exist; nothing in `/api/stops`, journeys, or `tariffs.json` gives km between two stops. Shapes exist (encoded polylines) but the plan never computes path length. Pricing page can render tables; “what will *this* ride cost?” cannot ship from this data without extra work.
- **Transfers.** 55-route network, five loops, 328 weekend-only, 10 single-direction lines. `minibus` already has a transfer search (`minibus/tests/test_minibus_routes.py`). Ignoring transfers is a conscious v1 product cut, not a small omission — call it one.
- **Sync ID stability across a *republish*.** IDs 505–514 were stable from 2026-08-08 through 2026-09-05. That is not evidence they survive a timetable rewrite that changes times. `payload_hash` keyed by journey id would then miss updates if they reuse IDs, or create orphans if they reallocate. Log `id → (start,end,route)` diffs in `SyncRun.stats`.
- **Empty-before-window.** `?day=2026-06-10` (Portugal Day) and `2026-04-05` (Easter), plus 2026-06-11…14, return `[]` on 101/102/301/335/N02. `?day=2027-06-10` returns the Sunday set. June 10 2026 is empty because **the feed has no data that far back**, not because holidays are special. `01` open question 4 (112 etc. seasonal) — 112/321/324/325 are empty on 2027-07-07 too; they are unloaded, not summer-only. 328 is weekend-only.

## 5. Design challenges

1. **Server-driven cutover — right, with holes.** Unversioned search resolving by `Atlantic/Azores` date is the only way old *online* clients work. Failure modes: (a) stale 24 h bootstrap UI vs live search; (b) `?dataset=legacy` left on a debug client after cutover; (c) offline path using bootstrap `activeDataset` as override (gap above); (d) old offline bundle, see B3. Clock-wrong offline showing the other network is acceptable as stated.

2. **Dual-dataset bundle size — unmeasured; AsyncStorage is a shared 6 MB SQLite, not a per-key 2 MB bucket.** Current transit bundle is one uncompressed JSON string (`offline-bundle.ts:117–130`). Wire gzip does not help: `fetch().json()` is decompressed before `JSON.stringify()`. `@react-native-async-storage/async-storage@2.2.0` caps the **whole** `RKStorage` DB at **6 MB** by default (`node_modules/.../android/config.gradle:85–95`, applied in `ReactDatabaseSupplier.java:44,104`). That DB is shared with the persisted React Query cache (`lib/query-provider.tsx:17–32`) and every other Zustand/AsyncStorage store. A ~2 MB bundle is not isolated headroom. Local `transit_*` tables are empty, so 1.3 MB remains arithmetic. **Default to `expo-file-system` now** (download → checksum → atomic replace → rollback), keep AsyncStorage for metadata only. Compare `cutoverAt` as an instant, not a local calendar date (Lisbon-clock tourists otherwise switch before Azores midnight).

3. **Stop collapse — right for pickers, weak at 164 m.** 629/630 consecutive pairs, median 11.5 m, the only non-consecutive pair is 18 m. Collapsing by name is the right picker model; tourists cannot choose a pole before they choose a destination. Surface the pole **code + map marker** after a result, as planned. For the 3 groups >100 m (especially Covoada 164 m along Av. 6 de Janeiro), a walking-distance hint on the result card is justified — not a second picker row. The 75 m import flag should list 14 groups, not 30. Accessibility: collapsing hides which pole has a shelter/kerb; upstream has no accessibility fields (`01` §8), so this cannot be solved in v1.

4. **Sequence matching — required, and the current mobile pipeline undoes it (B7).** First-occurrence is a real bug: `search.py:106`, `offline-bundle.ts:218`, **and** `extractTripSegment` (`transit-format.ts:172–199`). Server-only pair selection is not enough. On 335 (36 repeated names, one name ×3) shortest-ride-by-stop-count can yield a 1–2 stop hop; use elapsed duration. Contract-test Python and TypeScript against the same fixtures. Search currently filters on the **trip’s first stop time** (`search.py:113–118`), not boarding time — a late board on a loop that started earlier is dropped. The new matcher must compare against the selected board stop.

5. **Sync cadence — fine; prune is the danger, not the 7 minutes.** 0.35 s × ~1117 ≈ 7 min is polite (this review: 305 req / ~3 min, zero 429, no `Retry-After` / `X-RateLimit-*`, no `Access-Control-*` on azb). Weekly + late-August daily is right given B1 (they *are* still loading data; 07-25 empty, 08-08 full). User-Agent + budget cap: keep. **Do not prune on a partial 200** (gap). Route through the Pi from day one — azb is also Cloudflare (`server: cloudflare`, `cf-ray …-LIS`); Hetzner 403 on PDL is documented in `minibus/docs/tailscale-tracking-proxy.md`. The Pi currently forwards `/publicapi/*` only; the `/azb/* → /api/*` map in `02` §5 is real extra ops work, not a config toggle.

6. **Tracking dark — reasonable, not week-1.** Endpoint exists, fleet is `[]`, PDL shapes match. Building a second copy of `minibus/tracking_client.py` + a full `features/azoresbus/` surface before the preview banner is opportunity cost against a hard August deadline (`00` L164). Flag-gated empty states are cheap to get wrong. Ship the gateway path and `trackingEnabled: false`; defer the map UI until `/locations` is non-empty *or* until after preview ships.

7. **Missing: journey fares, alerts, transfers, GTFS.** No GTFS anywhere probed. Alerts stay on `RouteInfo` — fine. Fares cannot be computed per ride from km bands without distances. Transfers: acceptable for v1 only if search copy does not imply “we’ll get you there” for pairs the 55 lines don’t connect; the old network was simpler and users *will* try Povoação laterals (321/324/325 are empty).

## 6. Confirmed

- `Calendar` is exactly `WEEKDAY/SATURDAY/SUNDAY` — `transit/models.py:23–31`.
- `get_type_of_day` maps holidays → Sunday — `search.py:11–19`. Upstream does the same for the holidays probed, so storing three patterns and using this helper is a 1:1 map **if canonical dates are not themselves holidays**.
- First-occurrence bug at `search.py:106` and `offline-bundle.ts:218`.
- `Island.feature_flags` JSON — `tenancy/models.py:28`. Bootstrap today exposes modules + `maps`/`version`, not arbitrary nested flags (`tenancy/bootstrap.py:33–75`); `transitSchedule` is new work, not a reuse.
- `data_revision` + `compute_bundle_version` — `offline_bundle.py:51–90`. Fingerprint is `island.key:revision:stops_count:routes_count`; must add dataset counts + cutover as planned or a phase change will not invalidate.
- Minibus tracking client / cache / stale-grace / health probe is a fair template — `minibus/tracking_client.py`, `services_tracking.py`.
- Tailscale Pi proxy exists and is documented to forward `/publicapi/*` only — `minibus/docs/tailscale-tracking-proxy.md:60`.
- `MinibusImportMeta` shape — `minibus/models.py:83–87`.
- Celery beat via migration — `minibus/migrations/0006_periodic_task_harvest_route_shapes.py`.
- Three service patterns on 101 / 301 / 335 across 51 dates (2026-09-01 … 2027-01-31 weekly, 2027-07–08 weekly, plus holidays): only empty / weekday / Saturday / Sunday fingerprints. Summer 2027 weekdays match September weekdays. **No seasonal fourth timetable in this window.**
- `?day=` is ISO-date only; holidays resolve to Sunday when data exists.
- Locations endpoint live and empty; PDL detail key set matches `01` §6.

## 7. Still unknown

- **Full 895 vs max id 1259 accounting.** Did not repeat the 55×3 journey-list sweep (165 extra requests). Mechanism is explained (today-only unfiltered lists, empty inactive routes, ID gaps, weekend IDs). A one-off 55×3 recount after cutover still worth doing; not a fourth pattern on the routes that matter.
- **Journey ID reuse on a timetable republish** that actually changes stop times. Stable from 08-08 to 09-05 is the only window observed.
- **When `/api/locations` will populate**, and whether Hetzner is 403 on `azb` the way it is on `pdl` (this probe egressed via LIS and got 200).
- **112 / 321 / 324 / 325** — still zero through summer 2027. Operator question, not a calendar mystery.
- **Real offline bundle bytes** gzipped and as an AsyncStorage string — not measured; current `transit_line` table in `src/db.sqlite3` is empty so a local `build_offline_bundle()` is not a production-sized sample.
- **Whether any of the 14 groups >75 m is the “wrong” collapse for boarding** (Covoada 164 m in particular) — needs a person on the street, not another GET.
- **GTFS** published somewhere other than the site/API (email the operator). Homepage and the obvious URL guesses are clean.

---

Sources: live `GET` `https://azb.elevensystems.pt/api/*` and `https://azoresbus.pt/static/json/tariffs.json` on 2026-08-14; probe script `/tmp/azoresbus_review_probe.py`; findings dump `/tmp/azoresbus_review/findings.json`; files cited above in `SaoMiguelBus-api/src` and `SaoMiguelBus`.
