---
title: "AzoresBus changeover — overview and load-bearing decisions"
status: draft
date: 2026-08-14
revision: 2
supersedes: 2026-08-13 draft
source_of_truth: 98-review-findings.md
target_repos:
  - SaoMiguelBus-api
  - SaoMiguelBus
  - SaoMiguelBus-webapp
---

# Overview and load-bearing decisions

> **[98-review-findings.md](98-review-findings.md) is the source of truth.** Every
> measured number here is from `98` (2026-08-14). Where an earlier draft sentence
> survives, it survived because `98` confirmed it. Overturned sentences carry a `98`
> citation inline.

---

## Changed since the 2026-08-13 draft

| # | 2026-08-13 said | Now | Why |
|---|-----------------|-----|-----|
| 1 | Upstream has **exactly three** service patterns; map 1:1 onto `transit.Calendar` (`WEEKDAY`/`SATURDAY`/`SUNDAY`); "no school-day, summer, or exception calendar" | **Deleted.** Upstream is weekday-specific **and** school-term/seasonal. We need a GTFS-like service model: per-journey operating weekdays **plus** date ranges | `98` **B0** |
| 2 | Sync three canonical dates (next Wed/Sat/Sun after cutover), 165 journey-list GETs | **Deleted.** Bounded, **tiered date sample**: the current season's week every run, the opposite season's week monthly-or-on-change, plus known holidays. ~1 150 requests incremental / ~2 150 full | `98` **B0**, **B6** |
| 3 | Decision 3: "one sync, both periods, driven by `?day=`" — upstream serves the outgoing operator before 1 Sep | **Deleted.** This host serves **AzoresBus only** (data floor 2026-07-27). `?day=` selects *which AzoresBus journeys run that date*, not the concession. Legacy stays in our DB | `98` **B1**, claim 11 |
| 4 | Decision 4: the **current** offline bundle carries both datasets + `cutoverDate`; June installs switch offline | **Deleted.** A **new schema-versioned bundle endpoint**; today's endpoint keeps single-network semantics. Pre-`03` installs switch **online only** | `98` **B3** |
| 5 | `departureTime` can exceed 86400; convert with `divmod(seconds, 86400)` | **Deleted.** Zero values > 86400 anywhere. Night times **wrap to 0**; detect a *decrease along `sequence`* | `98` **B2** |
| 6 | 4 routes (`112`,`321`,`324`,`325`) "return zero journeys — seasonal or not yet loaded"; honour `isActive` | **Deleted.** Those are **school-term** lines, populated from 2026-09-14. `isActive: false` is a display flag; honouring it drops line **328** (weekend-only) | `98` **B5**, §4 gap "Empty-before-window" |
| 7 | `dataset` filter needed on `search_routes` + `transit_stops_view` | **Widened.** Every v2 **and** v3 reader must filter: compat load, `?all`, v2 route, offline bundle, `get_line_v3`, directions, gmaps, route weather, ads, atlas, trails, admin, directions **cache key** | `98` **B4** |
| 8 | Server-side sequence pair selection fixes loop routes | **Insufficient.** The app's `extractTripSegment` re-matches names and discards the server's pair. Fix is end-to-end | `98` **B7** |
| 9 | Legacy import untouched | **Deleted.** `legacy_import.py` and `validate_legacy_parity.py` are dataset-blind and will crash or corrupt once AzoresBus rows exist | `98` **B8** |
| 10 | 895 journeys; 30 stop groups > 75 m; median 12 m / mean 17 m | **Corrected.** **989** unique journey IDs in one term week; **14** groups > 75 m; median **11.5 m**, mean **16.5 m**, max **164.1 m** | `98` claims 2, 12, §3 |
| 11 | Offline bundle in `AsyncStorage`, "per-item ceiling" | **Corrected.** AsyncStorage `@2.2.0` caps the **whole** `RKStorage` DB at **6 MB**, shared with the persisted React Query cache. Default to `expo-file-system` | `98` §5 challenge 2 |
| 12 | `cutoverDate` compared against the device's local date | **Corrected.** Compare `cutoverAt` as an **instant** — a Lisbon-clock tourist would otherwise flip an hour before Azores midnight | `98` §5 challenge 2 |
| 13 | Bootstrap `activeDataset` usable as the offline dataset override | **Corrected.** A 24 h-persisted bootstrap from 31 August would override the bundle on 1 September. Override is **only** the preview toggle | `98` §4 gap "Stale bootstrap" |
| 14 | `payload_hash` lets the sync skip journey-detail fetches | **Corrected.** The hash is of the *detail* body, which you only have after fetching it. Use it to skip **DB writes**, not GETs | `98` §4 gap |
| 15 | Prune trips absent from the run | **Guarded.** Needs a floor: abort the prune if the journey count drops > X % vs the last successful `SyncRun`, and never prune on an empty season sample | `98` §4 gap "Prune safety" |
| 16 | Webapp out of scope | **Still deferred as UX, not as isolation.** `SaoMiguelBus-webapp/src/lib/api.ts:77–99` sends no `dataset`; it is safe only if B4 is complete | `98` **B4** |
| 17 | Route "25" | **Naming corrected.** Route **id** 25 is public line **301**. Route ids and `nameShort` line numbers are different namespaces | `98` claim 9 |
| 18 | — | **Added 2026-08-14, not in `98`:** production `transit_holiday` holds 16 rows ending **2025-06-19** — no 2026/2027 entries, so `is_holiday` is always false and the B6 sampler guard is a no-op. Seed + hard-fail + detect-from-upstream | [prerequisite](#-prerequisite-discovered-2026-08-14-the-holiday-table-is-stale) |
| 19 | — | **Added 2026-08-14, not in `98`:** `Operator`, `RouteInfo`, `StopGroup` (live, used by ad targeting) and trip votes are neither readers nor covered by the `dataset` tag, and each breaks differently | [02 §3.8](02-backend-plan.md) |
| 20 | — | **Added 2026-08-14, not in `98`:** saved user data points at the old network — `FavoriteStop` is keyed by `Stop` **PK** and can silently resolve to an unrelated AzoresBus stop; tracked-bus alarms fire for trips that no longer run | [03 §5d](03-mobile-plan.md) |
| 21 | Offline bundle carries both networks so a device flips at midnight with zero connectivity | **Narrowed 2026-08-14.** One network per bundle + an explicit **expired-bundle** state. Halves an unmeasured payload against a shared 6 MB cap; fails loudly instead of silently | [Decision 4](#the-bundle-carries-one-network-not-both--decided-2026-08-14) |
| 22 | Production `transit_*` state unknown | **Confirmed 2026-08-14** via `api.saomiguelhub.com`: populated, 194 legacy stops. The `dataset` default of `legacy` correctly tags every existing row — no data migration needed | — |

**Unchanged and still load-bearing:** server-driven cutover (Decision 1), the `dataset`
tag with date resolution on unversioned requests (Decision 2), stop collapse by name for
pickers with the pole surfaced after a result, sequence-based pair matching, tracking
built dark.

**Reversed since:** transfers were cut from v1 and are now shipped, bounded at one change
of bus — `GET /api/v3/transit/journeys`, mirrored offline. See "Product cuts" below.

---

## The requirement, restated

On **1 September 2026** São Miguel's bus network is replaced by the AzoresBus
concession: 55 routes, new numbering, a new 1456-stop network, new fares. The app
handles three phases:

| Phase | Dates | Behaviour |
|-------|-------|-----------|
| **Preview** | now → 2026-08-31 | Legacy timetables by default. Top banner with a toggle to preview the new ones. Preview results carry a "only valid from 1 September" warning. |
| **Live** | 2026-09-01 → 2026-09-30 | New timetables **only**. Top banner announcing they are live. Persistent "Valid since 1 September" badge. |
| **Settled** | 2026-10-01 → | Banner auto-hides. New timetables only. Badge retires with the banner. |

The constraint, stated honestly this time: **online, this happens without an app
update.** A build installed in June and never updated gets correct September timetables
because the server resolves the dataset. **Offline, it does not.** See Decision 4.

---

## Decision 1 — the cutover lives on the server, not in the app

**Kept from the 2026-08-13 draft.** The app ships no dates. Not `2026-09-01`, not
`2026-10-01`, nowhere.

`/api/v3/bootstrap` grows a `transitSchedule` block stating which dataset is active,
whether preview is offered, what the banner says, and when it retires. The app renders
it; it does not compute it.

```jsonc
"transitSchedule": {
  "activeDataset":     "azoresbus",              // what unversioned search returns today
  "previewDataset":    null,                     // "azoresbus" during preview
  "cutoverAt":         "2026-09-01T00:00:00+00:00",  // INSTANT (Azores midnight), not a date
  "nextTransitionAt":  "2026-10-01T00:00:00+00:00",  // when this block stops being true
  "phase":             "live",                   // preview | live | settled
  "banner": { "id": "azoresbus-live-2026-09", "tone": "info", "dismissible": false,
              "text": { "pt": "…", "en": "…" } },
  "badge":  { "text": { "pt": "Válido desde 1 de setembro", "en": "Valid since 1 September" } }
}
```

Two fields are new relative to the 2026-08-13 draft:

- **`cutoverAt` replaces `cutoverDate`.** A calendar-date comparison against the device's
  local date flips at Lisbon midnight for a tourist whose phone is still on WET/CEST,
  an hour before Azores midnight (`98` §5 challenge 2). Compare instants.
- **`nextTransitionAt`** exists because bootstrap is persisted for 24 h
  (`lib/query-provider.tsx:28`) with `staleTime` 5 min, and `useBootstrapCached` is
  `enabled: false` — it never refetches (`98` §4 gap "Stale bootstrap"). Without a
  transition timestamp the app has no way to know when its cached copy became a lie.
  The app schedules an invalidation at that instant.

Why server-driven and not a client date check, unchanged:

- **It survives a schedule slip.** If the concession start moves, one admin field changes.
- **It survives stale installs.** Old builds get the right data because they never had
  the decision to make.
- **Banner copy is editable** without a release.

`transitSchedule` is **new work** in `tenancy/bootstrap.py:33–75`, not a reuse of
existing flag plumbing: bootstrap today serializes modules plus `maps`/`version`, not
arbitrary nested `Island.feature_flags` (`98` §6).

## Decision 2 — `dataset` tag, and unversioned requests resolve by date

**Kept, and widened.** Add `dataset` (`legacy` | `azoresbus`) to `Line`, `Trip` and
`Stop`, defaulting to `legacy` so every existing row is correctly tagged by the default.

| Request | Resolves to |
|---------|-------------|
| no `dataset` param | **the date-appropriate dataset, decided server-side** from the `Atlantic/Azores` date |
| `?dataset=azoresbus` | new network (preview toggle only) |
| `?dataset=legacy` | outgoing network (admin/debug only) |

The default is what makes a June build correct in September.

**Widened scope (`98` B4):** the 2026-08-13 draft named two call sites. Adding rows
without filtering **every** reader interleaves the two networks — including on paths the
draft never listed: the v2 compat load the Expo offline fallback uses, `?all=`,
`get_line_v3` (which will raise `MultipleObjectsReturned` the moment line `101` exists
in both datasets — legacy already has `101`), the directions/gmaps/weather `.first()`
stop resolves, the **directions cache key**, ads targeting, the atlas importer's
`cleaned_name` upsert, trails' nearest-stop lookup, and the admin changelists. The
enumeration lives in [02 §7.0](02-backend-plan.md). `unique_together` on `Line` becomes
`('island', 'dataset', 'code')`.

**The preview override is one-directional.** `?dataset=` is the preview toggle and
admin/debug. It must never be populated from a cached `activeDataset`, and the app must
never send `dataset=legacy` on a public search URL (`98` §4 gap "Stale bootstrap").

Stops get the same treatment so pickers stop offering stops that no longer exist.

## Decision 3 — AzoresBus-only import from this host, with a **GTFS-like service calendar**

> **Replaces** the 2026-08-13 "one sync, both periods, driven by `?day=`, stored against
> `WEEKDAY`/`SATURDAY`/`SUNDAY`". Both halves of that sentence are false (`98` **B0**,
> **B1**).

**Half one — there is no second period to sync.** `azb.elevensystems.pt` serves
AzoresBus and nothing else. The draft's proof (route id 25, Sat 2026-08-15: 8 journeys
at 08:00 vs Sat 2026-09-05: 10 at 06:30) compared a **holiday** against a Saturday:
2026-08-15 is Assumption Day and returns the Sunday set, ids 515–522 (`98` B1, claim 11).
Non-holiday Saturdays 2026-08-08, 08-22 and 08-29 all return the September Saturday set —
ids 505–514, first 06:30, byte-identical response size to 2026-09-05. The **observed
data floor is 2026-07-27**; 07-25 and 07-26 return `[]`.

So: `?day=` selects *which AzoresBus journeys run that ISO date*. Legacy data stays
exactly where it is, retagged `dataset='legacy'`, never deleted — still queryable for
support. Dual dataset means **our legacy rows plus the AzoresBus import**, not two
periods pulled from one upstream.

**Half two — three calendars cannot represent this network.** `98` B0 measured, in the
week 2026-09-14…20:

| Line | Mon | Tue | Wed | Thu | Fri | Sat | Sun |
|------|-----|-----|-----|-----|-----|-----|-----|
| 102 | 27 | 27 | 28 (id `1009`) | 27 | 28 (id `1011`, **a different journey**) | 13 | 12 |
| 112 | 0 | **2** (`236`,`237`) | 0 | **2** | 0 | 0 | 0 |
| 315 | 24 | 24 | **23** | 24 | 24 | 9 | 7 |
| 318 | 12 | 12 | 12 | 12 | 12 **with different ids** | 8 | 8 |
| 307 | 38 | 38 | 38 | 38 | 38 | 13 | 0 |

and, seasonally, line 307 (`routeId=31`): **33** journeys first at 07:30 on 2026-08-31 /
09-02 / 09-11 and on 2027-07-12; **38** first at 07:00 on 2026-09-14 and 2027-01-11, the
extras being ids `633, 645, 647, 661, 662`.

Consequences that drive the schema:

- **A "next Wednesday after 1 September" sync lands on 2026-09-02 and stores the summer
  307 set.** From 14 September the live network has five school runs we would not have.
- Lines the 2026-08-13 draft called empty are **school-term** lines, not unloaded:
  `321` (ids 898–899), `324` (926–931), `325` (932–933) all populate in the 14 September
  week and were empty on 2026-09-02 and 2027-07-07. `112` is Tuesday/Thursday only.
- A full 55-route Mon–Sun sweep of that week found **989** unique journey IDs, not 895.
  Six appear only on non-Wednesday weekdays (`136, 236, 237, 864, 1011, 1222`). 270 gaps
  vs max id 1259 remain unexplained; `/api/journeys` and `/api/journeys/488` are 404.

**So we spec a GTFS-like service model** — per-journey operating **weekdays** *and*
**date ranges**, derived from a bounded date sample, with an exception table. Search and
the offline bundle must answer *"does this trip run on **this ISO date**?"*, not
`WEEKDAY|SAT|SUN`. `transit.Calendar` (`transit/models.py:23–31`) is expanded, not
reused as-is. Schema in [02 §3.3](02-backend-plan.md).

**And the sync becomes date sampling, not three GETs per route.** A full week **inside
term** (on or after 2026-09-14) and a full week **inside summer** (July–August), plus
known holidays — roughly 55 routes × ~16 dates, hundreds of extra requests, not
thousands. The two weeks are **tiered**: the season we are in is refetched every run; the
opposite season is fetched monthly or when a sentinel line changes, and otherwise reused
from stored observations. It earns its place not on weekday granularity — which
self-corrects once that season arrives — but on two things that are consumed *before* it
does: **date bounds** baked into offline bundles, and the "out of season ≠ deleted"
evidence the prune depends on ([02 §4.1](02-backend-plan.md), [02 §4.5](02-backend-plan.md)).
When capturing a *weekday* pattern, **skip dates upstream treats as Sunday**
(`98` B6): 2026-12-01 and 2026-12-08 are weekdays that already return Sunday sets.
`get_type_of_day`'s holiday→Sunday rule (`search.py:11–19`) still matches upstream for
every holiday probed — it is **necessary but not sufficient** (`98` §6).

**Honest limit:** the exact school-term start and end dates are **unknown** beyond the
observed 2026-09-14 flip and the summer-2027 reversion (`98` §7). 14 September is
**observed, not official**. The plan handles this by sampling weekly until the pattern
flips and storing per-journey date ranges from the sample — not by hardcoding a term
calendar. This is an open question worth an email to the operator, not a guess.

## Decision 4 — a **new** schema-versioned bundle endpoint; old installs switch online only

> **Replaces** the 2026-08-13 "the offline bundle carries both datasets and the cutover
> date, so a Premium user offline across the night wakes to the new timetables — including
> June installs" (`98` **B3**).

Why it cannot work as drafted: today's `offlineSearch` has no `dataset` concept and
`indexOf`s every row (`lib/offline-bundle.ts:203–226`). An optional `dataset` field on
existing rows is **ignored** by code already shipped, which then searches every row — so
emitting both networks in the current payload shape gives old clients **legacy and
AzoresBus interleaved**. Worse, `refreshOfflineBundle()` falls back to v2
(`/api/v2/webapp/load`) on **any** v3 error, not just a 404
(`lib/offline-bundle.ts:174–176`), so a 5xx or a shape the parser chokes on drops a
client onto the v2 path — which must therefore stay single-dataset (`98` B4).

**So:**

- Ship a **new, schema-versioned endpoint** (`/api/v3/transit/offline-bundle/v2` or
  equivalent). Only builds carrying [03](03-mobile-plan.md) request it.
- **Today's endpoint keeps its semantics**: one date-resolved network, single dataset.
- Bundle storage defaults to **`expo-file-system`** (download → checksum → atomic
  replace → rollback), with AsyncStorage for metadata only. `@react-native-async-storage/
  async-storage@2.2.0` caps the **whole** `RKStorage` SQLite DB at **6 MB**
  (`android/config.gradle:85–95`, applied at `ReactDatabaseSupplier.java:44,104`) — and
  that DB is shared with the persisted React Query cache and every Zustand store. A
  ~2 MB bundle is not isolated headroom (`98` §5 challenge 2). `expo-file-system` is
  already a dependency.
- The bundle carries `cutoverAt` as an **instant** and a `services` table (weekday mask +
  date ranges + exceptions), not a `weekday` enum.

### The bundle carries **one** network, not both — decided 2026-08-14

> **Narrows the 2026-08-13 Decision 4 further.** That draft had the bundle ship *both*
> networks so an offline device could flip at midnight with zero connectivity. Even in the
> new schema-versioned endpoint, **we are not doing that.**

The v2 bundle contains a single, server-resolved network plus `cutoverAt`. When a device
is offline past the cutover holding a pre-cutover bundle, the app does **not** silently
serve the dead network. It shows an explicit *"these timetables expired on 1 September —
connect once to update"* state, with a "show anyway" escape hatch behind it
([03 §5.2](03-mobile-plan.md)).

Why this over dual-network:

- **Size.** The payload is still unmeasured (`transit_*` is empty locally, `98` §7) and
  the storage budget is a shared 6 MB. Doubling an unknown against a shared cap is a bad
  trade regardless of how much time there is to do it in.
- **The population it protects is small.** It only matters for a user who is offline
  *across* midnight on 31 August **and** stays offline into September without a single
  reconnect. Everyone who reconnects once gets the correct network.
- **The failure mode is better.** Dual-network fails silently if the clock is wrong;
  single-network + staleness detection fails *loudly*, which is the right behaviour when
  the alternative is a tourist waiting for a bus that no longer exists.
- It removes most of [02 §7.4](02-backend-plan.md)'s per-row `dataset` handling and the
  whole `resolveOfflineDataset` branch in [03 §5.2](03-mobile-plan.md) — less client
  logic, and one fewer place for the two networks to leak into each other.

> A fourth argument — that this bought schedule relief — no longer applies now that the
> full scope is being built before 1 September. The three above stand on their own, so the
> decision is unchanged. If you would rather have zero-connectivity midnight switching
> back, the cost is a doubled payload against a shared 6 MB cap and a silent failure mode
> when the device clock is wrong.

**Open product call, worth revisiting after cutover:** whether "show anyway" should exist
at all. Stale timetables for a network that no longer runs are weak information; showing
nothing is safer but strands a tourist with no signal. Shipped with the escape hatch, and
the analytics event on it tells us whether anyone uses it.

**The honest matrix:**

| Client | Online on 1 Sep | Offline on 1 Sep |
|--------|-----------------|------------------|
| Build containing [03](03-mobile-plan.md), bundle refreshed on/after 1 Sep | server `resolve_dataset` | correct network, date-resolved services |
| Build containing [03](03-mobile-plan.md), bundle older than the cutover | server `resolve_dataset` | **expired-bundle state**, not wrong timetables |
| Build in the wild today (incl. June installs) | server switches unversioned search — **correct** | **impossible.** No dataset field, no cutover instant, no date-resolved services |

We do not claim otherwise anywhere in this plan set, in release notes, or in the banner
copy. The mitigation is release timing: get the `03` build into most hands during the
preview phase (see Sequencing), and accept that a Premium user who is offline across the
night on an old build sees the legacy network until they reconnect.

## Decision 5 — sequence matching is end-to-end, not server-side

**New decision.** The 2026-08-13 draft fixed first-occurrence matching on the server and
in `offlineSearch`, and that is not enough: online results are run through
`processTransitResults` → `extractTripSegment`
(`features/transit/hooks/useOfflineSearch.ts:75–81`, `lib/transit-format.ts:172–199`),
which re-matches by **name** and returns `null` if the destination name appears before
the origin is found. The server can correctly pick 301's later `C → A` (seq 40 → 59) and
the client will still throw the trip away (`98` **B7**).

Three implementations share the bug: `search.py:106`, `lib/offline-bundle.ts:218`, and
the legacy PWA's `offlineHandler.js:270–281`.

So:

- Search responses carry the selected `boarding.sequence` / `alighting.sequence`.
- `extractTripSegment` **honours those indices** instead of re-matching names.
- Tie-break, identically on both sides: earliest **board** timestamp, then shortest
  **elapsed duration** (not stop count — on 335, with 36 repeated names, stop count can
  select a one-stop hop), then stable trip id.
- Contract-test the Python and TypeScript matchers against the **same** 335/301 fixtures.

Also in scope: online search always sends `start: '00h00'`
(`useOfflineSearch.ts:44`) and reorders client-side, while the server filters on the
**trip's first stop time** (`search.py:113–118`). Filtering must move to the **selected
board stop's** time, or a late board on a loop that started earlier is dropped.

Confirmed loops: `301`, `303`, `306`, `323`, `N03`; `328` is a weekend loop; `305`
journey `608` is a loop. `335` is **not** a loop — it is a 97-stop route with 36
repeating names and 37 extra visits. Do not generalise a first-journey sample to a whole
route: `102` and `305` also repeat on other journeys (`98` claim 12).

## Decision 6 — build live tracking, ship it dark, defer the map

**Kept, scope trimmed.** `https://azb.elevensystems.pt/api/locations` answers `200 []`;
the payload shapes are confirmed from the live PDL deployment (same vendor). Detail
top-level keys are exactly `currentStopSequence, fleetId, id, journey, licensePlate,
position, route, speed, status`; the list endpoint returns only `color, id, position,
status` (`98` claim 14).

Ship the **gateway path, the client, the cache layer and the endpoints**, gated on
`Island.feature_flags['azoresbus']['trackingEnabled']`, surfaced in bootstrap as
`trackingEnabled: false`. **Defer the map UI** until `/api/locations` is non-empty *or*
until after preview ships. Building a second copy of the full `features/minibus/` surface
before the preview banner is opportunity cost against a hard August deadline, and
flag-gated empty states you cannot see are easy to get wrong (`98` §5 challenge 6).

---

## Product cuts, stated as cuts

- ~~**Transfers.** v1 searches direct trips only.~~ **Shipped** — see "Journey search"
  below. The reasoning that made it a cut still shapes the copy: 55 routes, several loops,
  `328` weekend-only, ten single-direction lines, and the Povoação laterals
  (`321`/`324`/`325`) that exist **in school term** and are empty in summer. Search copy
  must still not imply "we'll get you there" for pairs the network does not connect
  (`98` §5 challenge 7) — finding a change of bus widens what we can answer, it does not
  make the network reach everywhere.
- **Per-ride fares.** Tariff **tables** ship from `tariffs.json`. "What will *this* ride
  cost?" **cannot**: `fareUnitType: "km"` bands exist but nothing in `/api/stops`, the
  journeys, or `tariffs.json` gives kilometres between two stops. Encoded shapes exist;
  computing path length between two stops is separate work not in this plan
  (`98` §4 gap "Fare distance").
- **Accessibility per pole.** Collapsing 1456 stops to 816 names hides which pole has a
  shelter or kerb. Upstream has **no** accessibility fields, so this cannot be solved in
  v1 (`98` §5 challenge 3).
- **GTFS.** None found: 20 probed endpoints 404, no `gtfs`/`dados abertos` on the public
  site, `robots.txt` and `sitemap.xml` 404, conventional `/gtfs.zip` 404. That is a
  strong negative, **not proof** a private feed does not exist — ask the operator.

---

## Sequencing — dependency-ordered

> **Replaces the abstract four-week plan from the 2026-08-13 draft**, which put the
> offline work after the cutover it exists to handle. This is ordered by **what blocks
> what**, not by calendar. Everything listed ships before 1 September.

The two repos are independently deployable; the app degrades gracefully against an
un-migrated API (absent `transitSchedule` → behave exactly as today).

```
S0  PREREQUISITES — nothing that writes ServicePattern rows may run before these
    OPS  seed Holiday rows for 2026–2027 (see the prerequisite section below)
    OPS  curl azb from the API host — 200 or 403 decides whether the Pi is a blocker
    OPS  send the operator email (01 §10) — longest external lead time
    API  snapshot current search_routes behaviour BEFORE touching the matcher

S1  ISOLATION — no user-visible change; makes it safe for AzoresBus rows to exist
    API  dataset tag on Stop/Line/Trip + uniqueness changes (§3.1)
    API  B4 sweep: every v2/v3 reader, dataset in the directions cache key (02 §7.0)
    API  B8: pin legacy import + parity to dataset='legacy' (02 §3.6)
    API  adjacent models: Operator, RouteInfo, StopGroup, votes (02 §3.8)

S2  CALENDAR + SYNC — depends on S0 (holidays) and S1 (dataset)
    API  ServicePattern / ServiceException / ServiceObservation + legacy back-fill
    API  sync worker: tiered sampling, wrap detection, prune floor
    OPS  Pi /azb/* → azb/api/* mapping, verified with one GET
    API  first --dry-run, then a real full run; inspect the diff

S3  READ PATH — depends on S2 (there is data to resolve against)
    API  date-resolved search + stops, sequence pair selection, board-time filter
    API  boarding/alighting sequence in the search response (02 §7.1b)
    API  bootstrap.transitSchedule (cutoverAt, nextTransitionAt)
    API  tariffs sync + /api/v3/transit/tariffs

S4  APP — S3 is only required for the parts that consume it; B7 ships independently
    APP  extractTripSegment honours boarding/alighting sequence (B7) — no API dependency
    APP  bootstrap types + phase hook + nextTransitionAt invalidation
    APP  banner + preview toggle + badge
    APP  user-data migration: favourites, recents, tracked trips (03 §5d)
    APP  pricing screen (tables only)

S5  OFFLINE — depends on S3 (bundle content) and S4 (storage layer)
    API  v2 bundle endpoint (single network); current endpoint unchanged
    APP  file-system bundle storage + date-resolved offline services + expired state
    ---  measure real bundle bytes against a populated transit_*

S6  TRACKING — independent of everything above
    API  tracking client + endpoints, flag OFF
    APP  tracking gate; map UI whenever /api/locations is non-empty

S7  VERIFY
    ---  dry-run the cutover by moving cutoverAt on staging against an UNMODIFIED build
    ---  rollback drill (below)
    ---  Sep 1: nothing to deploy
    ---  Sep 14: FULL sync run. Verify 307 goes 33 → 38 and 112/321/324/325 appear.
         The one date where the data, not the code, changes under us.
```

**The only hard ordering constraints** are: S0 before S2 (a poisoned holiday table
produces poisoned patterns), S1 before any AzoresBus row exists (or readers mix
networks), S2 before S3, and S3+S4 before S5. Everything else can run in parallel.

**One release-timing fact, stated without alarm:** pre-`03` installs cannot switch
networks offline ([Decision 4](#decision-4--a-new-schema-versioned-bundle-endpoint-old-installs-switch-online-only)),
so the share of users on the S4/S5 build by 31 August is the offline-correctness rate on
1 September. Front-loading `extractTripSegment` and the storage layer within S4 is what
buys adoption time.

## Rollback

Every phase decision is one admin field, so rollback is an edit, not a deploy.

| Situation | Action |
|-----------|--------|
| Bad sync data found **before** 1 Sep | Leave `cutoverAt` alone; the active dataset is still `legacy`. Re-run the sync with `--no-prune`, inspect, fix. Nothing user-visible happened |
| Bad sync data found **after** 1 Sep | **You cannot roll back to a network that no longer runs.** Push `cutoverAt` forward only if the legacy timetable is genuinely more useful than a broken AzoresBus one — it usually will not be. The real remedy is `--resume`/re-sync forward. This asymmetry is why S7's dry-run matters |
| Preview causing confusion | `previewEnabled: false` — the toggle disappears from every installed build |
| Sync hammering upstream / operator complains | `AZORESBUS_SYNC_MAX_REQUESTS` to 0 or disable the beat entry; serving is unaffected, data just goes stale |
| Tracking misbehaving | `trackingEnabled: false` — entry point vanishes everywhere |
| Bundle v2 shipping something broken | Serve 404 on the v2 endpoint; `03` clients fall back to v1 per [03 §5.4](03-mobile-plan.md) and keep working single-network |

Rehearse the first and last rows on staging before 1 September. A rollback path you have
not executed is a hypothesis.

### ⚠ Prerequisite discovered 2026-08-14: the `Holiday` table is stale

**Not from `98`** — found by querying production (`api.saomiguelhub.com/api/v3/bootstrap`)
while planning this build. `transit_holiday` holds **16 rows, 15 of them 2024, newest
`2025-06-19`. There is not a single 2026 or 2027 holiday in production.**

`search.py:85` computes `is_holiday = Holiday.objects.filter(date=day_date.date()).exists()`,
so today **every date in 2026 and 2027 evaluates to "not a holiday."** Three consequences,
in rising order of damage:

1. **Search already diverges from upstream.** On 2026-12-25 our search returns `WEEKDAY`
   service; upstream returns the Sunday set. Same for 10-05, 12-01, 12-08, 2027-01-01,
   04-04, 06-10 — the exact dates `98` confirmed resolve to Sunday.
2. **The offline bundle ships the stale list.** `offline_bundle.py:97` and
   `compat.py:105` emit `Holiday.objects.all()`, so clients get 2024–2025 holidays and
   resolve holiday dates wrongly offline too — including in the new v2 bundle's
   `services` rule, which uses `holidays` for the holiday→Sunday branch.
3. **It silently disables the B6 sampler guard, which is the serious one.** [02 §4.1](02-backend-plan.md)
   says "never sample a weekday that is a known holiday as weekday evidence." *Known*
   means this table. With it empty for 2026, the sampler will treat 2026-12-01 and
   2026-12-08 as ordinary Tuesdays, record the Sunday journey set as **Tuesday
   evidence**, and bake that into a derived `ServicePattern`. That is precisely the
   holiday-poisoning failure `98` **B6** describes, arriving through a guard that looks
   correct in the plan and is a no-op in production.

**Fix, before the first sync run — this gates everything downstream:**

- Seed `Holiday` for 2026 and 2027: Portuguese national holidays plus the Azores/São
  Miguel regional ones already represented in the legacy list (`Senhor Santo Cristo dos
  Milagres`, `Dia dos Açores`, and the municipal entries). `legacy_import.py:656` seeded
  the current rows from the old PWA's table and nothing has extended them since.
- **Cross-check the seed against the 8 dates `98` confirmed**: 2026-08-15, 2026-10-05,
  2026-12-01, 2026-12-08, 2026-12-25, 2027-01-01, 2027-04-04, 2027-06-10. Any of those
  missing from the seed is a bug in the seed.
- **Then stop treating the table as the source of truth.** Our list is a *hint* about what
  upstream does; upstream's actual behaviour is observable. Have the sync **detect**
  holidays: if a sampled weekday returns that route's Sunday journey set, record a
  `ServiceException` — see [02 §4.1](02-backend-plan.md). That closes the gap for
  holidays we have not thought of, and for regional dates upstream may not honour.

Until the seed lands, **do not run a sync that writes `ServicePattern` rows.**

---

## Risk register

| Risk | Ref | Impact | Mitigation |
|------|-----|--------|------------|
| **Sync stores the wrong season** — a canonical-date sync in 1–13 Sep captures the summer timetable and misses five school runs on 307 alone | `98` **B0** | App shows a timetable that does not exist from 14 Sep | Date **sampling** across a term week and a summer week; per-journey weekday mask + date ranges ([02 §4.1](02-backend-plan.md)) |
| **Weekday-specific journeys lost** — 112 (Tue/Thu), 102 Wed vs Fri extras, 315 Wed, 318 Fri ids | `98` **B0** | Whole lines missing; wrong results on specific weekdays | GTFS-like service model; full Mon–Sun sample per season |
| **School-term boundaries unknown** | `98` §7 | Term/summer flip missed; stale timetable for weeks | Weekly sample until the pattern flips; store observed ranges; alert on a service-set change; ask the operator |
| **Syncing a non-existent "legacy period" from azb** | `98` **B1** | Wasted requests; worse, legacy rows overwritten with AzoresBus data | AzoresBus-only from this host; legacy stays in our DB (Decision 3) |
| **Holiday poisoning of a weekday sample** — 2026-12-01 / 12-08 are weekdays returning Sunday sets | `98` **B6** | Sunday journeys stored as weekday service | Skip known-holiday dates when capturing a weekday; assert the sampled set against the neighbouring weekday |
| **Night times mis-converted** — `divmod(86400)` never fires because nothing exceeds 86400 | `98` **B2** | N03 journey `984` reorders: seq 42 at 86341, seq 43 at 0, seq 47 at 600 | Detect a *decrease along `sequence`*, set `day_offset=1` from that point; order by `(day_offset, time)` or `sequence`, never `TimeField` alone ([02 §4.2](02-backend-plan.md)) |
| **Dual-dataset payload on the current bundle endpoint** | `98` **B3** | Old clients search both networks interleaved | New schema-versioned endpoint; current endpoint stays single-network; v2 compat load stays single-dataset |
| **Unfiltered readers mix networks** — compat load, `?all`, `get_line_v3`, directions, gmaps, weather, ads, atlas, trails, admin | `98` **B4** | `MultipleObjectsReturned` on line `101`; wrong coordinates; mixed pickers | Full reader sweep ([02 §7.0](02-backend-plan.md)); `('island','dataset','code')` uniqueness |
| **Directions cache serves the other network** — `build_cache_key` hashes origin/destination/day/start/locale only, TTL 24 h | `98` §4 gap | Preview and live share a cached Google result | Add `dataset` to `build_cache_key` (`directions_cache.py:14–36`) |
| **`isActive: false` honoured as "no service"** | `98` **B5** | Line 328 (weekend-only, ids 942–945) and 112/321/324/325 dropped | Import journeys for **every** listed route; treat `isActive` as display only |
| **Prune deletes a live network** — a 200 with a partial list looks complete | `98` §4 gap | Timetables vanish after an upstream deploy | Abort the prune if the journey count drops > X % vs the last successful `SyncRun`; never prune when a season's sample returns empty; prune per (dataset, service window), not globally |
| **`Holiday` table empty for 2026–2027** — 16 rows, newest 2025-06-19 in production | discovered 2026-08-14, not in `98` | Search diverges from upstream on every holiday; bundles ship a stale list; **the B6 sampler guard silently becomes a no-op** and Sunday sets get stored as Tuesday service | Seed 2026–2027 before the first sync; assert the 8 `98`-confirmed dates are present; hard-fail a run whose sample year has no holiday rows; **detect** holidays from upstream journey sets as `ServiceException` ([00 prerequisite](#-prerequisite-discovered-2026-08-14-the-holiday-table-is-stale), [02 §4.1](02-backend-plan.md)) |
| **`payload_hash` cannot skip detail GETs** — the hash is of a body you must fetch first | `98` §4 gap | Sync cost budget silently wrong; "resume" resumes nothing | Use the hash to skip **DB writes**; persist ETag/summary fingerprints if you want to skip GETs; stage bodies if you want real resume |
| **Journey ID reuse on a timetable republish** | `98` §7 | Hash keyed by journey id misses updates, or orphans rows | Log `id → (start, end, route)` diffs in `SyncRun.stats`; alert on churn. IDs 505–514 stable 08-08…09-05 is **not** republish-proof |
| **Stale bootstrap overrides the cutover** — persisted 24 h, `staleTime` 5 min, `useBootstrapCached` `enabled: false`, foreground only flushes analytics (`app/_layout.tsx:113–123`) | `98` §4 gap | 31 Aug `phase: preview` / `activeDataset: legacy` still applied on 1 Sep | `nextTransitionAt` + invalidate at that instant; `activeDataset` **never** used as a dataset override; never send `dataset=legacy` on a public URL |
| **Screen left open across midnight** — search keys omit dataset and start (`useOfflineSearch.ts:31–36`); stops use a permanent `['transit','stops']` key | `98` §4 gap | August results shown on 1 September | Invalidate transit queries at `nextTransitionAt` and on foreground. Webapp is worse: `staleTime` 30 min, `gcTime` 24 h, `refetchOnWindowFocus: false` (`src/lib/queryClient.ts:3–11`) |
| **AsyncStorage 6 MB is a whole-DB cap, not per key** — shared with the persisted RQ cache | `98` §5 challenge 2 | Bundle write fails or evicts the query cache | `expo-file-system` with checksum + atomic replace + rollback; AsyncStorage for metadata only |
| **`cutoverAt` compared as a local calendar date** | `98` §5 challenge 2 | Lisbon-clock tourists flip an hour early | Compare instants |
| **Client undoes server pair selection** — `extractTripSegment` returns `null` when the destination name precedes the origin | `98` **B7** | Loop routes silently return no results even after the server fix | Sequence ids in the response, honoured client-side; contract tests in both languages on 335/301 fixtures |
| **Legacy import / parity crash or corrupt** — `update_or_create(island, cleaned_name)` and unfiltered `.count()` | `98` **B8** | Re-running the importer overwrites AzoresBus rows; parity fails permanently | Pin every import/parity query to `dataset='legacy'` |
| **Bundle fingerprint misses a phase change** — `island.key:revision:stops_count:routes_count` | `98` §6 | Cached bundle survives the cutover | Fold per-dataset counts, cutover instant and the active service window into `compute_bundle_version` |
| **Pi proxy `/azb` mapping is real work** — the Pi forwards `/publicapi/*` only | `98` §5 challenge 5 | Sync blocked on day one, or run direct from Hetzner and get Cloudflare-blocked | Add `/azb/* → azb.elevensystems.pt/api/*` before the first scheduled run (`minibus/docs/tailscale-tracking-proxy.md`) |
| **Upstream blocks our datacenter IPs, as it already does for PDL** | `98` §5 challenge 5 | Sync fails silently | Route through the Pi from day one; identify with a `User-Agent`; alert on sync age |
| **Stop collapse is wrong at 164 m** — 3 groups > 100 m (Covoada 164, Alfândega 134, Forte S. Brás 108) | `98` §5 challenge 3 | User walks to the wrong pole | Walking-distance hint on results for > 100 m groups; flag the **14** groups > 75 m at import; pole code + map after a result |
| **Stop-name collisions between the two networks** | `98` **B4** | Wrong results, bad pickers | `dataset` in the stop uniqueness key |
| **Upstream data still churning up to 1 September** | `98` §5 challenge 5 | We serve a stale September | Daily cadence for late August, weekly after; the feed *is* still being loaded (07-25 empty, 07-27 populated) |
| **Concession start slips** | — | Wrong network on the day | Server-driven `cutoverAt` — one admin edit |
| **Device clock wrong while offline** | — | Wrong network offline | Bounded: shows the other dataset, never an empty app; server corrects on reconnect |
| **Fleet never reports on `/api/locations`** | `98` claim 13 | Tracking stays dark | Already dark by design; map UI deferred until the fleet exists |
| **On-wire stop count exceeds 816** — `serialize_stops_v3` adds short-name aliases (`v3.py:13–15` → `compat.py:12–39`) | `98` §4 gap | Bundle sized against the wrong number | Measure the real payload; do not treat 816 as the on-wire size |
| **Real dual-bundle bytes unknown** — local `transit_*` tables are empty | `98` §7 | Size mitigations chosen blind | Measure against a real import before shipping to Premium users on mobile data |

---

## Explicitly out of scope

- **Real-time arrival predictions.** Upstream exposes vehicle position and
  `currentStopSequence`, not predicted arrivals. ETAs would be ours to compute —
  `features/minibus/lib/liveEtas.ts` is the implementation to borrow from later.
- **Ticketing / card top-ups.** No upstream API.
- **Migrating the legacy network away.** It stays, retagged `dataset='legacy'`.
- ~~**Transfer/multi-leg search.**~~ **Shipped**, bounded at ONE change of bus.
  `GET /api/v3/transit/journeys` returns direct rides and one-transfer itineraries as
  alternating `ride`/`transfer` legs; `/transit/search` is untouched, because shipped
  builds have no leg concept and would draw a two-bus journey as one bus. A change is
  allowed at the same stop or one within 250 m, costing 5 minutes plus walking time, and
  never onto the same line. Riders who will not change bus can turn transfers off
  (`maxTransfers=0`, a toggle in the planner, ON by default); when that finds
  nothing the answer carries `transfersAvailable` so the app can offer the
  itineraries a change WOULD find rather than guessing. The app mirrors the scan
  offline in `lib/journey-search.ts`
  over the v2 bundle — no bundle schema change was needed. The v1 bundle stays
  direct-only, as frozen. Two changes of bus remains out of scope: the network is
  hub-and-spoke through Ponta Delgada, so a second change buys almost no real journeys
  while offering itineraries a rural timetable cannot honour.
- **Per-ride fare calculation.** Not derivable from this data. See above.
- **The webapp's preview toggle and cutover banner.** Deferred **UX**. The new webapp
  (`SaoMiguelBus-webapp/src/lib/api.ts:77–99`) sends no `dataset` and will follow server
  date resolution — which is safe **only if the B4 reader sweep is complete**. The
  legacy PWA under `SaoMiguelBus-webapp/legacy/` still talks v2 and carries the same
  first-occurrence bug (`offlineHandler.js:270–281`). Deferring the banner is a product
  call; deferring dataset isolation is not on the table (`98` B4).
