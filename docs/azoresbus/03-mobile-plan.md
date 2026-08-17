---
title: "feat: AzoresBus changeover — Expo app plan"
status: draft
date: 2026-08-14
revision: 2
supersedes: 2026-08-13 draft
type: feat
target_repo: SaoMiguelBus
source_of_truth: 98-review-findings.md
---

# Mobile plan — `SaoMiguelBus` (Expo)

All paths relative to the `SaoMiguelBus` repo. Depends on
[02 §7.2](02-backend-plan.md) (bootstrap `transitSchedule`), [02 §7.1b](02-backend-plan.md)
(sequence data in search results), [02 §7.4](02-backend-plan.md) (the **new** bundle
endpoint) and [02 §8](02-backend-plan.md) (tracking endpoints).

**The governing rule for this repo:** no date literal for the changeover appears anywhere
in the app. Every phase decision comes from `transitSchedule`. The only exception is the
offline path (§5), which compares the device clock against a `cutoverAt` **instant that
was itself delivered by the server** and cached.

---

## 0. What this app can and cannot do on 1 September

> **Read this before anything else.** The 2026-08-13 draft claimed the cutover would work
> "without an app update, including June installs and Premium offline across the night."
> The offline half of that is **false** (`98` **B3**).

| Client | Online on 1 Sep | Offline on 1 Sep |
|--------|-----------------|------------------|
| This build, bundle refreshed on/after 1 Sep | server `resolve_dataset` — **correct** | correct network, date-resolved services |
| This build, bundle older than the cutover | server `resolve_dataset` — **correct** | **expired-bundle state** (§5.2) — not wrong timetables |
| Build in the wild today (incl. June installs) | server switches unversioned search — **correct** | **impossible** |

> **The bundle carries one network, not two** — decided 2026-08-14
> ([00 Decision 4](00-overview-and-decisions.md)). A device offline across midnight with a
> pre-cutover bundle does **not** silently flip; it says so and asks for one reconnect.
> This halves an unmeasured payload against a shared 6 MB budget and removes the whole
> `resolveOfflineDataset` branch — less client logic, and one fewer place for the two
> networks to leak into each other.

Why the bottom-right cell cannot be fixed from the server: today's `offlineSearch` has no
`dataset` concept and `indexOf`s every row (`lib/offline-bundle.ts:203–226`). An optional
`dataset` field on existing rows is **ignored** by code already shipped, which then
searches every row — so emitting both networks in the current payload shape gives already-
installed clients **legacy and AzoresBus interleaved**, which is worse than not switching.
`absent ⇒ 'legacy'` protects old *cached bundles*, not old *code* consuming a new bundle.

Compounding it: `refreshOfflineBundle()` falls back to `/api/v2/webapp/load` on **any**
v3 error, not just a 404 (`lib/offline-bundle.ts:174–176`). A 5xx, or a schema the parser
chokes on, drops a client onto the v2 path — which is why that path stays single-dataset
on the server ([02 §7.0](02-backend-plan.md)).

**So:** old installs switch **online only**. The mitigation is release timing — get this
build into most hands during the preview phase (§10) — not a server trick. Say this
plainly in release notes; do not imply otherwise in banner copy.

---

## 1. Types and the phase hook

### `lib/types.ts`

```ts
export type TransitDataset = 'legacy' | 'azoresbus';
export type SchedulePhase = 'preview' | 'live' | 'settled';

export interface TransitScheduleBanner {
  id: string;                       // dismissal key — changing it re-shows the banner
  tone: 'info' | 'warning';
  dismissible: boolean;
  text: Record<string, string>;     // locale → copy
}

export interface TransitScheduleConfig {
  activeDataset: TransitDataset;
  previewDataset: TransitDataset | null;   // non-null ⇒ offer the toggle
  cutoverAt: string;                       // ISO INSTANT, not a calendar date
  nextTransitionAt: string | null;         // when this config stops being true
  phase: SchedulePhase;
  banner: TransitScheduleBanner | null;
  badge: { text: Record<string, string> } | null;
}

// BootstrapResponse gains:
//   transitSchedule?: TransitScheduleConfig;   // optional — older API returns nothing
//   trackingEnabled?: boolean;
```

`transitSchedule` is **optional on purpose**. Against an un-migrated API the app must
behave exactly as it does today.

> **`cutoverAt` replaces `cutoverDate`, and it is an instant** (`98` §5 challenge 2).
> Comparing `todayLocalISO() >= bundle.cutoverDate` flips at *device-local* midnight — for
> a tourist whose phone is still on Lisbon time, that is an hour before Azores midnight,
> and they would see September timetables on 31 August. Compare
> `Date.now() >= Date.parse(cutoverAt)`.

> **`nextTransitionAt` is new and it is load-bearing** (`98` §4 gap "Stale bootstrap").
> Bootstrap is persisted for 24 h (`lib/query-provider.tsx:28`), `useBootstrap` has
> `staleTime` 5 min (`useTransitQueries.ts:27`), and **`useBootstrapCached` is
> `enabled: false` — it never refetches**. App foreground only flushes analytics
> (`app/_layout.tsx:113–123`); it does not invalidate bootstrap, stops, or search. Without
> a transition instant, a config cached on 31 August is still being applied on
> 1 September.

### `features/transit/hooks/useScheduleConfig.ts`

One hook, one source of truth:

```ts
export function useScheduleConfig(): {
  config: TransitScheduleConfig | null;
  phase: SchedulePhase | null;
  dataset: TransitDataset | null;   // ONLY set when the user is previewing — see below
  canPreview: boolean;
  isPreviewing: boolean;
  setPreviewing: (on: boolean) => void;
}
```

It reads `useBootstrapCached()`, falls back to the cached bundle's copy of the config, and
layers the user's preview toggle on top. **Every component reads this hook — nothing reads
`bootstrap.transitSchedule` directly.**

**Two rules the 2026-08-13 draft got wrong** (`98` §4 gap "Stale bootstrap"):

1. **`dataset` is `null` unless the user is actively previewing.** It is *not*
   `config.activeDataset`. `activeDataset` is for **display** ("which network am I
   looking at") and must never become a request parameter. Sending a stale
   `dataset=legacy` from a 24 h-old bootstrap on 1 September would pin a client to the
   old network — and [02 §7.1](02-backend-plan.md) states explicit requests win forever.
2. **The app never sends `dataset=legacy` on a public search URL.** The only value it may
   ever send is `previewDataset`, and only while `isPreviewing`.

Preview state lives in `lib/profile-store.ts` (the existing Zustand + AsyncStorage profile)
as `transitPreviewDataset?: TransitDataset`, and is **cleared automatically** once
`phase !== 'preview'` — otherwise a user who toggled preview in August is stuck in a
meaningless mode in September.

### Invalidation at the transition instant

New, and it is what makes the phase hook honest:

```ts
// features/transit/hooks/useScheduleTransition.ts
// Schedule a single invalidation at nextTransitionAt; re-arm on foreground.
// Also invalidate on foreground if nextTransitionAt has already passed.
queryClient.invalidateQueries({ queryKey: ['bootstrap'] });
queryClient.invalidateQueries({ queryKey: ['transit'] });   // search AND stops
```

Wire it into the existing `AppState` handler in `app/_layout.tsx:113–123`, which today
only flushes analytics. Two failure modes this closes (`98` §4 gap "Mid-session midnight"):

- **A screen left open across midnight.** Search query keys omit dataset and start
  (`useOfflineSearch.ts:31–36`, `useTransitQueries.ts:56`) and stops use a permanent
  `['transit', 'stops']` key, so 31 August results survive into 1 September.
- **A backgrounded app** whose 24 h-persisted bootstrap is now a lie.

---

## 2. The banner

New `features/transit/components/ScheduleChangeBanner.tsx`, rendered at the top of
`app/(tabs)/transit/index.tsx` above `TransitPlannerCard`.

| Phase | Content |
|-------|---------|
| `preview` | Copy from `banner.text` + a **Switch** — "Ver os novos horários". Dismissible ⇒ collapses to a slim chip that can be re-expanded (never gone entirely; users need the way back). |
| `live` | Copy from `banner.text`, `tone: 'info'`, not dismissible. |
| `settled` | `banner` is `null` from the server → renders nothing. |

Renders nothing when `config` is null, or when `banner` is null. No phase logic in the
component beyond "is there a banner, and does it have a toggle" — the server decides.

Dismissal is keyed on `banner.id` in the profile store, so changing the id server-side
re-surfaces it to everyone. Useful if week-one copy needs a correction.

Copy lives in `banner.text[locale]` with a fallback chain `locale → 'pt' → first value`.
Add `locales/*/transit.json` strings only for the static furniture (the toggle label, the
"new timetables" chip), not the banner body.

**Copy constraint** ([00](00-overview-and-decisions.md)): search now finds journeys with
one change of bus, so "no DIRECT connection" is no longer the right hedge — the app has
already looked for the change. What has not changed is that the network does not reach
everywhere on every day: users **will** try the Povoação laterals — `321`/`324`/`325`
exist **in school term** and are empty in summer (`98` §5 challenge 7). So the empty state
says what is true of the day searched, and points at the next thing to try:
"Sem ligação de X para Y neste dia" is honest; "não é possível" is not.

---

## 3. Preview mode and the warning

When `isPreviewing`, `useTransitSearch` sends `?dataset=azoresbus`
([02 §7.1](02-backend-plan.md)). The query key must include the dataset or React Query
will serve legacy results for a preview search:

```ts
queryKey: ['transit', 'search', params, dataset]
```

The same applies to `useStops` (`['transit', 'stops', dataset]`) — the pickers must offer
the previewed network's stops, otherwise a user picks a stop that does not exist in the
dataset being searched and gets zero results.

> Add `dataset` to these keys **even outside preview** (as `null`/`'server'`), together
> with the invalidation in §1. The current keys omit both dataset and start
> (`useOfflineSearch.ts:31–36`), which is half of the midnight-rollover problem.

**The warning is non-negotiable and must be attached to the results, not the screen.** A
user who scrolls past the banner, or shares a screenshot, must still see that these times
are not yet valid.

- A persistent strip above `RouteResults`: *"Horários válidos apenas a partir de 1 de
  setembro"* — formatted from `cutoverAt` via `lib/date-format.ts`, never a literal.
- A small chip on **each** `RouteCard` in preview mode.
- Include it in `features/transit/share-trip.ts` output so shared trips carry the caveat.

`TrackButton` / bus-tracking must be **disabled in preview mode** — scheduling a track
against timetables not yet in force would fire alarms on the wrong days.

---

## 4. The "valid since" badge (live phase)

During `live`, `badge.text` renders as a small chip next to the results header and on
`TripDetail`. It disappears in `settled` because the server stops sending `badge` — no
client-side date comparison.

---

## 5. Offline and Premium

This is where the app is allowed to know about time, because there is no server to ask.

### 5.1 A new endpoint, not a new field on the old one

Request **`/api/v3/transit/offline-bundle/v2`** ([02 §7.4](02-backend-plan.md)). Do not
extend the existing bundle shape — see §0 for why (`98` **B3**).

```ts
export interface OfflineServiceRule {
  days: string;            // "1111100" Mon…Sun
  from: string | null;     // ISO date, inclusive
  to: string | null;
  added: string[];         // ISO dates forced ON
  removed: string[];       // ISO dates forced OFF
}

export interface OfflineRouteRowV2 {
  id: number;
  line: string;
  service: string;         // key into bundle.services
  stops: number[];         // indices into bundle.stops
  codes: string[];         // pole code per position
  times: number[];         // seconds since midnight
  offsets: number[];       // day_offset per position — night wrap (98 B2)
}

export interface OfflineBundleV2 {
  schema: 2;
  version: string;
  island: string;
  dataset: TransitDataset;              // which ONE network this bundle contains
  cutoverAt: string;                    // INSTANT
  nextTransitionAt: string | null;
  schedule: TransitScheduleConfig;      // cached copy for offline banner rendering
  holidays: { date: string; name: string }[];
  stops: OfflineStop[];
  services: Record<string, OfflineServiceRule>;
  routes: OfflineRouteRowV2[];
}
```

**`services` replaces the `weekday` enum**, and this is the whole point. A
`WEEKDAY|SATURDAY|SUNDAY` field cannot express line 112 (Tuesday **and Thursday only**),
102's distinct Wednesday and Friday extras, or 307's 33 ↔ 38 school-term flip
(`98` **B0**). Offline search must answer *"does this trip run on **this ISO date**?"*:

```ts
function runsOn(bundle: OfflineBundleV2, row: OfflineRouteRowV2, isoDate: string): boolean {
  const svc = bundle.services[row.service];
  if (svc.removed.includes(isoDate)) return false;
  if (svc.added.includes(isoDate)) return true;
  if (svc.from && isoDate < svc.from) return false;
  if (svc.to && isoDate > svc.to) return false;
  // Upstream resolves holidays to Sunday service; mirror the server rule exactly.
  const idx = isHoliday(bundle.holidays, isoDate) ? 6 : mondayFirstIndex(isoDate);
  return svc.days[idx] === '1';
}
```

This must be **byte-for-byte the same rule** as the server's `does_run`
([02 §3.3](02-backend-plan.md)), or online and offline disagree on exactly the lines that
are hardest to notice.

### 5.2 Staleness detection — the bundle does not switch networks

> **Replaces `resolveOfflineDataset`.** Decided 2026-08-14
> ([00 Decision 4](00-overview-and-decisions.md)): the bundle carries **one** network, so
> there is no dataset to resolve offline. What remains is detecting that the bundle has
> outlived the network it describes.

```ts
type BundleFreshness = 'fresh' | 'expired';

function bundleFreshness(bundle: OfflineBundleV2): BundleFreshness {
  // The bundle describes ONE network. If it predates the cutover and the cutover has
  // passed, the network it describes no longer runs.
  if (!bundle.cutoverAt) return 'fresh';                  // pre-changeover bundle, no cutover known
  if (bundle.dataset !== 'legacy') return 'fresh';        // already the post-cutover network
  return Date.now() >= Date.parse(bundle.cutoverAt) ? 'expired' : 'fresh';
}
```

**`expired` is a UI state, not a filter.** Results are hidden behind an explicit panel:

> *"Estes horários expiraram a 1 de setembro. A rede mudou — liga-te à internet uma vez
> para atualizar."* — with a secondary **"Ver mesmo assim"** action.

Rationale, and the part worth arguing about: showing the legacy timetable after 1 September
means showing departures for buses that **do not run**. Silently serving them is worse than
saying nothing. But a tourist with no signal is badly served by a blank screen, so the
escape hatch exists. Fire an analytics event on it (§8) — if nobody taps it, remove it.

**Instant comparison, not a local calendar date** (`98` §5 challenge 2): a phone still on
Lisbon time would otherwise mark the bundle expired an hour before Azores midnight.

**No preview override here.** The 2026-08-13 draft let bootstrap's `activeDataset` act as
an offline override; a `activeDataset: 'legacy'` cached on 31 August would then have
overridden the bundle's own answer on 1 September (`98` §4 gap "Stale bootstrap"). With a
single-network bundle that whole parameter disappears — one fewer way to get it wrong.

A wrong device clock now degrades to *showing the expired panel early*, or to serving a
network that is one day stale — bounded, visible, and corrected by any reconnect.

### 5.3 Storage: `expo-file-system`, not AsyncStorage

> **Corrected.** The 2026-08-13 draft called AsyncStorage's limit a "per-item ceiling" and
> filed the move to a file as a *maybe*. It is neither (`98` §5 challenge 2).

`@react-native-async-storage/async-storage@2.2.0` caps the **entire `RKStorage` SQLite
database at 6 MB** by default (`android/config.gradle:85–95`, applied in
`ReactDatabaseSupplier.java:44,104`). That database is **shared** with the persisted React
Query cache (`lib/query-provider.tsx:17–32`), the profile store, and every other
AsyncStorage consumer. A ~2 MB bundle is not isolated headroom — it is 2 MB out of a
budget everything else is also drawing on, and overflow surfaces as opaque write failures
or an evicted query cache.

So the bundle moves to **`expo-file-system`** (already a dependency, `~56.0.8`):

1. Download to a temp path.
2. Verify a checksum/length against the `/version` probe response.
3. **Atomic replace** of the live file.
4. Keep the previous file until the replacement parses; **roll back** if it does not.
5. AsyncStorage keeps **metadata only** — path, version, fetchedAt, schema.

`features/minibus/offline.ts` is the pattern to follow.

**Size is unmeasured.** The "~1.3 MB" in the 2026-08-13 draft was arithmetic over 895
journeys; the real term-week count is **989** (`98` §3), and `serialize_stops_v3`
duplicates short-name aliases so the on-wire stop count exceeds 816 (`98` §4 gap). Local
`transit_*` tables are empty, so nothing has actually been weighed (`98` §7). **Measure
after the first real import** ([02 §10](02-backend-plan.md) step 4) before shipping to
Premium users on mobile data. Wire gzip does not help the client side: `fetch().json()`
decompresses before anything is stored.

### 5.4 Keeping the local copy fresh

`refreshOfflineBundleIfStale()` already probes `/version` before downloading. Changes:

1. Probe the **v2** version endpoint. The server fingerprint now folds in per-dataset
   counts, the cutover instant and the **effective service window**
   ([02 §7.3](02-backend-plan.md)), so both a phase change and a school-term flip
   invalidate the cache.
2. **Force a refresh attempt** when the app foregrounds and `Date.now()` has passed the
   cached bundle's `nextTransitionAt` — or `cutoverAt` has passed and the cached rows are
   still legacy-only.
3. **Narrow the v2 fallback.** `refreshOfflineBundle()` currently falls back to
   `/api/v2/webapp/load` on **any** thrown error (`lib/offline-bundle.ts:174–176`). Fall
   back only on 404/501-style "endpoint not present" responses; a 5xx or a parse failure
   should retry and keep the existing bundle, not silently downgrade a client to the
   single-network v2 payload (`98` **B3**).

Consider dropping `MIN_SYNC_INTERVAL` from 1 h to ~15 min for the fortnight around the
cutover, driven by a **server value**, not a constant.

---

## 5b. Duplicate stops: one picker entry, pole shown at boarding time

Upstream ships 1456 stops under 816 names because each side of a road is its own stop
code, and the pair is **selected by direction of travel**
([02 §3.2](02-backend-plan.md)).

### The picker shows **one** entry per name — 816, not 1456

`StopPicker.tsx` lists the collapsed `Stop` rows. Showing both poles would render two rows
reading *"PONTA DELGADA (ALFÂNDEGA)"* with nothing to tell them apart, and would ask the
user a question they cannot answer (which side to board is a consequence of where they are
going, which they have not entered yet).

Median separation is **11.5 m**; the worst case in the network is **164.1 m**. There is no
walking decision to make at the picker stage.

### The side of the road is shown **after** a result exists

| Surface | Treatment |
|---------|-----------|
| `RouteCard` | Stop code chip on the boarding stop: **`1002`** — the number printed on the physical pole |
| `TripDetail` / `RouteTimeline` | Boarding row shows code + *"sentido {headsign}"* |
| `RouteMap` | Marker at the **exact pole coordinates** (`boarding.lat/lon`), not the collapsed centroid, with the route line drawn through it |

**Plus a walking hint for the far groups.** Three names span > 100 m — `COVOADA (AV. 6 DE
JANEIRO)` 164.1 m, `PONTA DELGADA (ALFÂNDEGA)` 134 m, `P. DELGADA (FORTE S. BRÁS)` 108 m.
For those, the result card shows the distance between poles alongside the code. **Not a
second picker row** (`98` §5 challenge 3). Whether Covoada is genuinely the wrong collapse
on the street is an open question the server-side > 75 m flag (14 groups) exists to
surface.

**No accessibility affordance is possible in v1.** Collapsing hides which pole has a
shelter or kerb, and upstream has **no** accessibility fields
([01 §2](01-upstream-api-reference.md)). Do not invent an icon for data we do not have.

Render pole details only when present — legacy-dataset results omit them
([02 §7.1b](02-backend-plan.md)) and older API builds send nothing.

### Search never asks the user to disambiguate

No "which stop did you mean?" step, no direction selector. Origin → destination determines
the direction, the direction determines the pole. A genuine non-road-pair collision is an
upstream data problem to flag in the sync report, not a question to push onto the user.

---

## 5c. Sequence matching — the client currently undoes the server's fix

> **New section, and the highest-priority app change in this plan** (`98` **B7**).

Every online result already passes through `processTransitResults` → `extractTripSegment`
(`features/transit/hooks/useOfflineSearch.ts:75–81`, `lib/transit-format.ts:172–199`).
That helper walks stops until the **first** name matching origin, then the first matching
destination after it — and **returns `null` if a destination name appears before origin is
found**:

```ts
// lib/transit-format.ts:172–199
if (stopMatchesQuery(destQuery, stop.name)) {
  if (!foundOrigin) {
    return null;
  }
```

So the server can correctly pick 301's later `C → A` (seq 40 → 59) and **the app throws
the trip away**. Fixing `search.py` alone changes nothing a user can see.

**Required changes, in order:**

1. **`extractTripSegment` honours `boarding.sequence` / `alighting.sequence`** from the
   response ([02 §7.1b](02-backend-plan.md)) and slices on those indices. Name matching
   becomes the *fallback* for responses that carry no sequence data (legacy dataset, older
   API), not the primary path.
2. **`offlineSearch` uses the same rule** — `lib/offline-bundle.ts:218` has the identical
   `indexOf` bug. Enumerate all valid `(board, alight)` index pairs where `board < alight`:

   ```ts
   function validPairs(row: OfflineRouteRowV2, originIdx: number, destIdx: number) {
     const origins = row.stops.flatMap((s, i) => (s === originIdx ? [i] : []));
     const dests   = row.stops.flatMap((s, i) => (s === destIdx   ? [i] : []));
     return origins.flatMap((o) => dests.filter((d) => d > o).map((d) => [o, d] as const));
   }
   ```

3. **Identical tie-break on both sides**, or online and offline diverge on exactly the
   routes that are hardest to spot: earliest **boarding** time
   `(offsets[o], times[o])`, then shortest **elapsed duration**, then stable trip id.
   **Not stop count** — on 335 (36 repeating names) fewest-stops can pick a one-stop hop
   (`98` §5 challenge 4).
4. **Ordering respects `day_offset`.** N03 journey `984` wraps: seq 42 at 86341, seq 43 at
   0, seq 47 at 600 (`98` **B2**). Any sort by raw time reorders it. Render a `+1` badge
   from `offsets` on night results.

**Affected routes, for the fixture set:** loops `301`, `303`, `306`, `323`, `N03`, plus
`328` (weekend loop) and `305` **journey `608`**. `335` is **not** a loop — it is a
97-stop route with 36 repeating names and 37 extra visits. `102` and `305` also repeat on
journeys other than their first, so do not treat "13 routes" as the whole set
(`98` claim 12).

**The same bug exists in the legacy PWA** (`SaoMiguelBus-webapp/legacy/js/offlineHandler.js:270–281`).
Out of scope here, tracked in [00](00-overview-and-decisions.md).

---

## 5d. User data that points at the old network

> **Discovered 2026-08-14 while auditing the plan for completeness — not in `98`.** Every
> other section deals with *timetables*. This one deals with the things a user has already
> saved, which reference a network that stops existing on 1 September. Nothing in the
> 2026-08-13 draft addressed it.

`lib/profile-store.ts` persists four kinds of reference to the legacy network:

| Data | Shape | What happens on 1 Sep | Required |
|------|-------|----------------------|----------|
| **`FavoriteStop`** | `{ id: number; name: string }` (`profile-store.ts:15–18`), matched by `isFavoriteStop(stopId: number)` | **The sharpest one.** `id` is a `Stop` primary key. Legacy stop PKs and AzoresBus stop PKs come from the same sequence, so a saved id either points at a stop no longer in the active dataset, or — worse — silently resolves to an **unrelated AzoresBus stop** that happens to hold that PK | Re-resolve by `name` against the active dataset on first launch after the cutover. Match → rewrite `id`. No match → keep the entry, mark it unavailable, show it greyed with a "no longer served" note rather than deleting it silently |
| **`FavoriteRoute`** | `{ origin: string; destination: string }` (`:9–13`) | Name-keyed, so it survives *iff* both names exist in the new network. Legacy has 194 stops; AzoresBus collapses to ~816 with different naming conventions, so many will not resolve | Validate both endpoints against the new stop list; keep unresolvable favourites visible but flagged, with a tap-to-fix that opens the picker |
| **`RecentSearch`** | `{ origin, destination, day, time, at }` (`:20–26`) | Same name-matching issue, lower stakes | Filter unresolvable entries out of `RecentSearches.tsx` rather than rewriting them. Recents are disposable; do not spend UI on repair |
| **`TripVoteEntry`** | keyed on trip id | Legacy trip votes stay attached to legacy trip ids, which the active dataset no longer returns | No client work. But see [02 §3.8](02-backend-plan.md) — confirm the server's `< 60 %` likes prefix does not mark every AzoresBus route unconfirmed on day one |

**Tracked trips (`TrackButton.tsx`)** deserve their own line. A tracked bus is an alarm
scheduled against a specific legacy trip. After the cutover those trips do not run, so the
alarm either fires for a bus that will never arrive or fails silently. **Clear scheduled
tracks at the cutover transition** — reuse the `nextTransitionAt` invalidation from §1 —
and tell the user once: *"os alertas guardados foram removidos porque a rede mudou."*
Silently dropping them is worse than the alarm.

**Run the migration on the transition, not on a date literal.** It hangs off the same
`nextTransitionAt` hook as the query invalidation (§1), so it works whenever the server
says the cutover happened — including if the concession slips.

**Do not delete anything the user created.** Every row above is recoverable by re-resolving
against the new network, and a user who opens the app on 1 September to find their saved
stops gone will read that as data loss, not as a network changeover.

## 6. Pricing screen

New route `app/(tabs)/transit/prices.tsx`, reached from the transit screen and the sidebar.

- `useTariffs()` → `GET /api/v3/transit/tariffs`, `staleTime` 6 h, persisted to the offline
  cache so it works offline.
- Sections per category; rows per tariff. Two renderers, chosen on `fareUnitType`: a
  **banded table** (`band` → `price`) and a **single price**. Drive this off the data, not
  a hardcoded category list — the operator will restructure it.
- **No price literal anywhere in the app.** Not €7, not €31.75, not the €6 card fee. Every
  number renders from the payload; a screen with no data renders a loading or empty state,
  never a fallback price.
- **`fareUnits` is a string, always** — all 148 values are labels like `"0 a 5"`, `"6 a 7"`,
  `"8"` ([01 §7](01-upstream-api-reference.md)). Render verbatim; never parse into a range
  and never sort numerically.
- Header shows the effective date and *"Atualizado a {lastUpdatedAt}"*, both from the
  payload's real upstream metadata.
- When `isFuture`, show the same "from 1 September" treatment as §3.
- `notes` (the payload's `comment`) renders below the tables.
- Reuse `MinibusTariffTable.tsx` as the visual reference for consistency.

> **The screen shows tables, never a computed fare.** `fareUnitType: "km"` bands exist,
> but nothing upstream gives kilometres between two stops, so "what will *this* ride
> cost?" **cannot** ship (`98` §4 gap "Fare distance"). Do not add a "calculate my fare"
> affordance, and do not attach a price estimate to a `RouteCard`. If a user asks, the
> honest answer is the band table plus the operator's link-out from `infos[]`.

---

## 7. Live tracking — types and gate now, map deferred

> **Scope trimmed** (`98` §5 challenge 6). The 2026-08-13 draft built the full
> `features/azoresbus/` surface — map, markers, vehicle sheet, line filter — in week 3.
> The fleet is `[]` today, so that is a complete second copy of `features/minibus/`
> reviewed against nothing, built against a hard August deadline whose real target is the
> preview banner.

**Week 3 ships:**

- `bootstrap.trackingEnabled` in types, defaulting to `false` when absent.
- The entry point **hidden entirely** while the flag is false. No teaser, no "coming soon".
- Nothing else.

**After preview ships, or once `/api/locations` returns a non-empty fleet**, build
`features/azoresbus/` mirroring `features/minibus/`:

| New | Modelled on |
|-----|-------------|
| `hooks/useAzoresbusTrackingQueries.ts` | `useMinibusTrackingQueries.ts` |
| `hooks/useAzoresbusTrackingHealth.ts` | `useMinibusTrackingHealth.ts` |
| `components/AzoresbusLiveMap.tsx` | `MinibusLiveMap.tsx` |
| `components/AzoresbusVehicleMarker.tsx` | `MinibusVehicleMarker.tsx` |
| `components/AzoresbusVehicleSheet.tsx` | `MinibusVehicleSheet.tsx` |
| `components/AzoresbusLiveLineFilter.tsx` | `MinibusLiveLineFilter.tsx` |
| `app/(tabs)/transit/live.tsx` | `app/(tabs)/minibus/live.tsx` |

The vehicle payload is the same vendor's shape, so `route`/`journey`/`circulations` types
and the polyline decode (`lib/polyline.ts`) are shared. Lift genuinely common pieces into
`lib/` rather than forking them — but do **not** refactor `features/minibus/` into a shared
abstraction as part of this work. Copy, ship, converge later.

**List and detail are different shapes** ([01 §6](01-upstream-api-reference.md)): the list
gives `color, id, position, status`; the detail gives nine keys with **no top-level
`color`** — it lives on `detail.route.color` (`98` claim 14). A marker built from the list
and a sheet built from the detail read colour from different places.

**Three distinct empty states**, and getting these right is most of the UX value:

| Server says | UI |
|-------------|-----|
| `trackingEnabled: false` | Entry point **hidden entirely** |
| enabled, `[]` | "Nenhum autocarro em circulação neste momento" |
| enabled, upstream error | `MinibusTrackingUnavailable`-style message + retry |

Since `/api/locations` currently returns `[]`, the second state is exactly what you will
see the moment the flag is flipped — build and review it against the real endpoint, not a
mock. That is also the argument for deferring: there is nothing to review yet.

Polling: 10 s while the screen is focused, stop on blur — same as minibus. Never poll in
the background.

---

## 8. Analytics

Enough to answer "did the changeover go well?" without new infrastructure — extend the
existing `track()` calls:

- `transit_schedule_preview_toggled` — `{ enabled, phase }`
- `transit_search` — add `dataset`, `phase`, and the **resolved ISO date** to the existing
  event (the date matters now that eligibility is per-date, not per-day-type)
- `transit_schedule_banner_dismissed` — `{ bannerId, phase }`
- `transit_prices_viewed` — `{ effectiveDate, isFuture }`
- `transit_offline_bundle_refreshed` — `{ schema, version, bytes, source }` — the only way
  we will find out the real bundle size in the field
- `azoresbus_live_opened` — `{ vehicleCount }` (when the map ships)

**The one to watch on 1 September:** searches returning **zero results**, split by dataset.
A spike means a stop-name mismatch between what the pickers offer and what search matches —
the most likely day-one failure.

**The one to watch on ~14 September:** zero-result searches on the school lines. If 112,
321, 324, 325 or the 307 extras do not appear when term starts, the observed term start
was wrong ([02 §4.1](02-backend-plan.md)).

---

## 9. Testing

| Area | Test |
|------|------|
| **Back-compat** | Bootstrap without `transitSchedule` → app behaves exactly as today, no banner, server-resolved search. **Write this first.** |
| Phase rendering | Each of `preview`/`live`/`settled` → correct banner, toggle, badge |
| Toggle plumbing | Preview on → `dataset=azoresbus` in the request **and** in the query key |
| **No stale dataset** | A cached bootstrap with `activeDataset: 'legacy'` and preview **off** → the search request carries **no** `dataset` param (`98` §4 gap) |
| Stops follow dataset | Preview on → pickers list the new network's stops |
| Preview warning | Warning present on the results strip *and* on each card; tracking disabled |
| Stale preview | Preview left on, phase moves to `live` → flag cleared, no stale UI |
| **Transition invalidation** | Clock advanced past `nextTransitionAt` + foreground → bootstrap, search and stops queries invalidated; a results screen open across the boundary refetches (`98` §4 gap) |
| **`cutoverAt` is an instant** | Device on Europe/Lisbon at 2026-08-31T23:30 local (22:30 Azores) → still **legacy**; 2026-09-01T01:30 Lisbon → **azoresbus** (`98` §5 challenge 2) |
| **Date-resolved offline services** | v2 bundle fixture: line 112 returns results for a Tuesday and **nothing** for a Monday; 307 returns 38 rows for 2026-09-14 and **33** for 2027-07-12 (`98` **B0**) |
| **Expired bundle** | A `dataset: 'legacy'` bundle + device clock past `cutoverAt` → expired panel, results hidden; "show anyway" reveals them and fires the analytics event (§5.2) |
| **Not-expired** | A `dataset: 'azoresbus'` bundle past `cutoverAt` → `fresh`, no panel. A legacy bundle *before* `cutoverAt` → `fresh` |
| **Bundle holidays cover the range** | The v2 fixture's `holidays` include 2026-12-08 and 2027-01-01; a bundle whose holidays stop at 2025 fails the test (mirrors the production gap found 2026-08-14) |
| **Favourite stop re-resolve** | A `FavoriteStop` whose `id` exists in the new dataset as an **unrelated** stop is re-resolved **by name**, not silently kept — the PK-reuse case (§5d) |
| **Favourite stop unavailable** | A favourite whose name has no match is retained, flagged unavailable, and **not deleted** |
| **Favourite route repair** | A `FavoriteRoute` with one unresolvable endpoint renders flagged with a tap-to-fix, not hidden |
| **Recents filtered** | Unresolvable `RecentSearch` entries are filtered from the list, not rewritten |
| **Tracked trips cleared** | Scheduled tracks against legacy trips are cleared at `nextTransitionAt` and the user is told once (§5d) |
| **Migration is transition-driven** | Moving `cutoverAt`/`nextTransitionAt` on a fixture triggers the §5d migration — no date literal anywhere in the path |
| **Holiday offline** | 2026-12-08 (Tuesday) resolves to the **Sunday** service set, matching the server |
| **`runsOn` parity** | The TypeScript `runsOn` and the Python `does_run` agree on every date in a shared fixture calendar |
| **Loop routes — online** | 301 fixture with `boarding.sequence: 40` / `alighting.sequence: 59` survives `extractTripSegment` instead of returning `null` (`98` **B7**) |
| **Loop routes — offline** | 335 / 301 fixture: `C → A` where `A` is also stop 1 returns the trip. **Assert online and offline pick the same `(board, alight)` pair** |
| **Cross-language contract** | The **same** fixture files drive this test and [02 §9](02-backend-plan.md)'s Python matcher test |
| **Tie-break** | On a 335 fixture with two valid pairs, both sides choose the shorter **elapsed duration**, not the fewer stops |
| **Night wrap** | N03 journey `984` fixture (seq 42 `86341` → seq 43 `0` → seq 47 `600`) renders in sequence order with a `+1` badge; no sort by raw time (`98` **B2**) |
| **Not-a-wrap** | N02's separate `00:00` journey renders as its own trip, no `+1` badge |
| **File-system bundle** | Download → checksum mismatch → previous bundle retained, no partial file; successful download → atomic replace; AsyncStorage holds metadata only (`98` §5 challenge 2) |
| **Fallback narrowing** | v2 endpoint 404 → falls back to `/api/v2/webapp/load`; **5xx or parse error → keeps the existing bundle**, does not downgrade (`98` **B3**) |
| Picker collapse | 1456-stop fixture → 816 picker rows, no visually identical duplicates |
| Walking hint | `COVOADA (AV. 6 DE JANEIRO)` result shows the pole distance; an 11 m group shows only the code |
| Boarding pole | Result with `boarding.code` → chip renders; result without → nothing renders, no `undefined` |
| Old bundle | A cached v1 bundle (no `dataset`, no `services`) → treated as legacy, no crash, and a v2 refresh is attempted |
| Tracking gate | `trackingEnabled: false` → entry point absent; `true` + `[]` → empty state, not an error |
| **No hardcoded prices** | Grep assertion: no currency literal in `app/(tabs)/transit/prices.tsx` or its components; tariffs fixture with an empty payload renders an empty state, not a fallback price |
| Locale fallback | Banner text missing the active locale → falls back to `pt` |

Snapshot the three phases in `__tests__/` by feeding `useScheduleConfig` a fixture. The
`cutoverAt` and transition tests **do** need a mocked clock — that is new, and it is the
price of comparing instants instead of trusting a server field.

---

## 10. Rollout

1. **Types + `useScheduleConfig` + query-key changes + the transition invalidation
   (§1).** Inert: the API sends no `transitSchedule` yet, so nothing renders.
   **Shippable immediately.**
2. **`extractTripSegment` honours boarding/alighting sequence (§5c).** Also inert today —
   the server does not send sequences yet, and the name-matching fallback is unchanged —
   but it is the single change that must be in the field before the server's sequence
   selection means anything. **Ship it with step 1, not after.**
3. Banner, toggle, preview warnings, badge. Still inert until the server enables preview.
4. **User-data migration (§5d)** — favourites re-resolve, recents filter, tracked trips
   cleared. Hangs off the same `nextTransitionAt` hook as step 1, so it must not ship
   before it.
5. Pricing screen (tables only).
6. File-system bundle storage + the v2 endpoint + date-resolved offline services +
   the expired-bundle state (§5.2).
7. Tracking gate only. Map UI whenever `/api/locations` returns a non-empty fleet (§7).

Ship 1–3 to the stores **well before the server flips `previewEnabled`** — that build
needs to be the one in most users' hands during preview.

> **Store rollout is now on the critical path for offline correctness.** Because
> pre-`03` installs cannot switch networks offline (§0), the fraction of users on this
> build by 31 August *is* the offline-correctness rate on 1 September. Track adoption and
> say so in the release notes; do not present it as solved.

Bump the `version` patch in `app.json` on each of these, per the usual convention.

**On 1 September the app team does nothing** — for online users. For offline users, what
happens on 1 September was decided by how many of them updated in August.
