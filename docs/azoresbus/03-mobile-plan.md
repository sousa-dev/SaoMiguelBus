---
title: "feat: AzoresBus changeover — Expo app plan"
status: draft
date: 2026-08-13
type: feat
target_repo: SaoMiguelBus
---

# Mobile plan — `SaoMiguelBus` (Expo)

All paths relative to the `SaoMiguelBus` repo. Depends on
[02-backend-plan.md](02-backend-plan.md) §7 (bootstrap `transitSchedule`) and §8
(tracking endpoints).

**The governing rule for this repo:** no date literal for the changeover appears
anywhere in the app. Every phase decision comes from `transitSchedule`. The only
exception is the offline path (§5), which compares the device date against a
`cutoverDate` **that was itself delivered by the server** and cached.

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
  cutoverDate: string;                     // ISO date
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

### `features/transit/hooks/useScheduleConfig.ts`

One hook, one source of truth:

```ts
export function useScheduleConfig(): {
  config: TransitScheduleConfig | null;
  phase: SchedulePhase | null;
  dataset: TransitDataset;         // what to request right now (respects the toggle)
  canPreview: boolean;
  isPreviewing: boolean;
  setPreviewing: (on: boolean) => void;
}
```

It reads `useBootstrapCached()`, falls back to the cached offline bundle's copy of the
config, and layers the user's preview toggle on top. **Every component reads this hook
— nothing reads `bootstrap.transitSchedule` directly.** That is what keeps the offline
fallback honest in one place.

Preview state lives in `lib/profile-store.ts` (the existing Zustand + AsyncStorage
profile) as `transitPreviewDataset?: TransitDataset`, and is **cleared automatically**
once `phase !== 'preview'` — otherwise a user who toggled preview in August is stuck in
a meaningless mode in September.

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
Add `locales/*/transit.json` strings only for the static furniture (the toggle label,
the "new timetables" chip), not the banner body.

---

## 3. Preview mode and the warning

When `isPreviewing`, `useTransitSearch` sends `?dataset=azoresbus`
([02 §7.1](02-backend-plan.md)). The query key must include the dataset or React Query
will serve legacy results for a preview search:

```ts
queryKey: ['transit', 'search', params, dataset]
```

The same applies to `useStops` (`['transit', 'stops', dataset]`) — the pickers must
offer the previewed network's stops, otherwise a user picks a stop that does not exist
in the dataset being searched and gets zero results.

**The warning is non-negotiable and must be attached to the results, not the screen.**
A user who scrolls past the banner, or shares a screenshot, must still see that these
times are not yet valid.

- A persistent strip above `RouteResults`: *"Horários válidos apenas a partir de 1 de
  setembro"* — using `cutoverDate` formatted via `lib/date-format.ts`, never a literal.
- A small chip on **each** `RouteCard` in preview mode.
- Include it in `features/transit/share-trip.ts` output so shared trips carry the caveat.

`TrackButton` / bus-tracking must be **disabled in preview mode** — scheduling a track
against timetables that are not in force yet would fire alarms on the wrong days.

---

## 4. The "valid since" badge (live phase)

During `live`, `badge.text` renders as a small chip next to the results header and on
`TripDetail`. It disappears in `settled` because the server stops sending `badge` — no
client-side date comparison.

---

## 5. Offline and Premium

This is where the app is allowed to know about dates, because there is no server to ask.

`lib/offline-bundle.ts`:

```ts
export interface OfflineRouteRow {
  // …existing…
  dataset?: TransitDataset;        // absent ⇒ 'legacy' (old bundles stay valid)
}

export interface OfflineBundle {
  // …existing…
  cutoverDate?: string;
  schedule?: TransitScheduleConfig;   // cached copy for offline banner rendering
}
```

`offlineSearch()` gains dataset resolution mirroring the server's rule:

```ts
function resolveOfflineDataset(bundle: OfflineBundle, override?: TransitDataset): TransitDataset {
  if (override) return override;                       // preview toggle
  if (!bundle.cutoverDate) return 'legacy';            // pre-changeover bundle
  return todayLocalISO() >= bundle.cutoverDate ? 'azoresbus' : 'legacy';
}
```

then filters `row.dataset ?? 'legacy'` alongside the existing `row.weekday` check.

**A Premium user who is offline across the cutover switches correctly**, because the
bundle carries both networks and the date. That is the whole reason for
[00 Decision 4](00-overview-and-decisions.md).

### Keeping the local DB fresh

`refreshOfflineBundleIfStale()` already probes `/version` before downloading. Two changes:

1. The server fingerprint now folds in the cutover date and per-dataset counts
   ([02 §7.3](02-backend-plan.md)), so a phase change invalidates the cached bundle.
2. **Force a refresh attempt when the app foregrounds and the cached bundle's
   `cutoverDate` is in the past but its rows are still legacy-only** — the belt-and-braces
   case of a bundle downloaded long before September on a device that was offline for weeks.

Consider dropping `MIN_SYNC_INTERVAL` from 1 h to ~15 min for the fortnight around the
cutover, driven by a server value rather than a constant.

### Size

The bundle carries two networks for a while. `AsyncStorage` on Android has a per-item
ceiling that a ~2 MB JSON string can approach. Before shipping:

- measure the real payload;
- if it is uncomfortable, move the bundle from `AsyncStorage` to a file in
  `expo-file-system` (the pattern `features/minibus/offline.ts` can inform this);
- and consider dropping the legacy dataset from the bundle once `phase === 'settled'` —
  the server can simply stop sending it.

---

## 5b. Duplicate stops: one picker entry, pole shown at boarding time

Upstream ships 1456 stops under 816 names because each side of a road is its own stop
code, and the pair is **selected by direction of travel**
([02 §3.2](02-backend-plan.md)). The product decisions follow from that:

### The picker shows **one** entry per name — 816, not 1456

`StopPicker.tsx` lists the collapsed `Stop` rows. Showing both poles would render two
rows reading *"PONTA DELGADA (ALFÂNDEGA)"* with nothing to tell them apart — the classic
duplicate-entry bug, and it would ask the user to answer a question they cannot answer
(which side to board is a consequence of where they are going, which they have not
entered yet).

The median separation is **12 m**; the worst case in the entire network is 164 m. There
is no walking decision to make at the picker stage.

### The side of the road is shown **after** a result exists

Once origin, destination and a trip are known, the pole is fully determined — so that is
where we surface it:

| Surface | Treatment |
|---------|-----------|
| `RouteCard` | Stop code chip on the boarding stop: **`1002`** — the number printed on the physical pole |
| `TripDetail` / `RouteTimeline` | Boarding row shows code + *"sentido {headsign}"* |
| `RouteMap` | Marker at the **exact pole coordinates** (`boarding.lat/lon`), not the collapsed centroid, with the route line drawn through it |

The stop code is the highest-value detail: a user standing between two poles can read
the number off the pole and confirm. Direction (`sentido Ribeira Grande`) is the natural-
language backup for anyone not looking at a sign.

Render these only when present — legacy-dataset results omit them
([02 §7.1b](02-backend-plan.md)) and older API builds send nothing.

### Search never asks the user to disambiguate

No "which stop did you mean?" step, no direction selector. Origin → destination
determines the direction, the direction determines the pole. If we ever hit a genuine
case of two same-named stops that are *not* a road pair, that is an upstream data
problem to flag in the sync report ([02 §3.2](02-backend-plan.md), the > 75 m check), not
a question to push onto the user.

### Offline search must get the loop-route fix too

`lib/offline-bundle.ts:218` resolves stops with `stopKeys.indexOf()` — first occurrence.
**13 of 50 routes revisit a stop name within one journey** (route 335: 37 of 97 stops;
five routes are loops), so first-occurrence matching silently drops valid trips
([02 §3.3](02-backend-plan.md)).

Port the same sequence-based rule the server uses:

```ts
function validPairs(row: OfflineRouteRow, originKey: string, destKey: string) {
  const keys = row.stops.map(normalizeStopKey);
  const origins = keys.flatMap((k, i) => (k === originKey ? [i] : []));
  const dests   = keys.flatMap((k, i) => (k === destKey   ? [i] : []));
  return origins.flatMap((o) => dests.filter((d) => d > o).map((d) => [o, d] as const));
}
```

Pick the earliest valid pair, shortest ride on ties — identical tie-breaking to the
server, or online and offline results diverge on exactly these 13 routes.

To keep the bundle honest, each route row carries a parallel `codes: string[]` array
(pole code per sequence position) so offline results can show the boarding code too.
It is ~5 bytes per stop — cheap next to the stop names already in there.

---

## 6. Pricing screen

New route `app/(tabs)/transit/prices.tsx`, reached from the transit screen and the
sidebar.

- `useTariffs()` → `GET /api/v3/transit/tariffs`, `staleTime` 6 h, persisted to the
  offline cache so it works offline.
- Sections per category; rows per tariff. Two renderers, chosen on `fareUnitType`:
  a **banded table** (`band` → `price`) and a **single price**. Drive this off the data,
  not a hardcoded category list — the operator will restructure it.
- Header shows the effective date and *"Atualizado a {lastUpdatedAt}"*.
- When `isFuture`, show the same "from 1 September" treatment as §3.
- `notes` (the payload's `comment`, e.g. the €6 card fee) renders below the tables.
- Reuse `MinibusTariffTable.tsx` as the visual reference for consistency.

---

## 7. Live tracking — built, hidden

Build the full surface now, gated on `bootstrap.trackingEnabled`
([02 §8](02-backend-plan.md)), so it appears with no app update.

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

The vehicle payload is the same vendor's shape, so `route`/`journey`/`circulations`
types and the polyline decode (`lib/polyline.ts`) are shared. Lift the genuinely common
pieces into `lib/` rather than forking them — but do not refactor `features/minibus/`
into a shared abstraction as part of this work. Copy, ship, converge later.

**Three distinct empty states**, and getting these right is most of the UX value:

| Server says | UI |
|-------------|-----|
| `trackingEnabled: false` | Entry point **hidden entirely**. No teaser, no "coming soon". |
| enabled, `[]` | "Nenhum autocarro em circulação neste momento" |
| enabled, upstream error | `MinibusTrackingUnavailable`-style message + retry |

Since `/api/locations` currently returns `[]` ([01 §6](01-upstream-api-reference.md)),
the second state is exactly what you will see the moment the flag is flipped — build
and review it against the real endpoint, not a mock.

Polling: 10 s while the screen is focused, stop on blur — same as minibus. Never poll in
the background.

---

## 8. Analytics

Enough to answer "did the changeover go well?" without new infrastructure — extend the
existing `track()` calls:

- `transit_schedule_preview_toggled` — `{ enabled, phase }`
- `transit_search` — add `dataset` and `phase` to the existing event
- `transit_schedule_banner_dismissed` — `{ bannerId, phase }`
- `transit_prices_viewed` — `{ effectiveDate, isFuture }`
- `azoresbus_live_opened` — `{ vehicleCount }`

The one to watch on 1 September: searches returning **zero results**, split by dataset.
A spike means a stop-name mismatch between what the pickers offer and what search
matches — the most likely day-one failure.

---

## 9. Testing

| Area | Test |
|------|------|
| **Back-compat** | Bootstrap without `transitSchedule` → app behaves exactly as today, no banner, legacy search. **Write this first.** |
| Phase rendering | Each of `preview`/`live`/`settled` → correct banner, toggle, badge |
| Toggle plumbing | Preview on → `dataset=azoresbus` in the search request **and** in the query key |
| Stops follow dataset | Preview on → pickers list the new network's stops |
| Preview warning | Warning present on the results strip *and* on each card; tracking disabled |
| Stale preview | Preview left on, phase moves to `live` → flag cleared, no stale UI |
| Offline switch | Bundle with both datasets + `cutoverDate`; device date 31 Aug vs 1 Sep → correct dataset |
| **Loop routes offline** | **Route 335 / 301 fixture: `C → A` where `A` is also stop 1 returns the trip. Assert online and offline pick the same pair.** |
| Picker collapse | 1456-stop fixture → 816 picker rows, no visually identical duplicates |
| Boarding pole | Result with `boarding.code` → chip renders; result without → nothing renders, no `undefined` |
| Old bundle | Bundle without `dataset` on rows → treated as legacy, no crash |
| Tracking gate | `trackingEnabled: false` → entry point absent; `true` + `[]` → empty state, not an error |
| Locale fallback | Banner text missing the active locale → falls back to `pt` |

Snapshot the three phases in `__tests__/` by feeding `useScheduleConfig` a fixture —
faster and more honest than mocking the clock, since the app has no clock logic to mock.

---

## 10. Rollout

1. Types + `useScheduleConfig` + query-key changes. Inert: the API sends no
   `transitSchedule` yet, so nothing renders. **Shippable immediately.**
2. Banner, toggle, preview warnings, badge. Still inert until the server enables it.
3. Pricing screen.
4. Offline dual-dataset search.
5. Tracking screens behind `trackingEnabled`.

Ship 1–2 to the stores **well before the server flips `previewEnabled`** — that build
needs to be the one in most users' hands during preview. Everything after is
server-controlled.

Bump the `version` patch in `app.json` on each of these, per the usual convention.

**On 1 September the app team does nothing.** If that is not true, the plan has been
implemented wrong.
