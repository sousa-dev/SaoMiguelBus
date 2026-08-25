---
title: "Premium — pinning and tracking on the AzoresBus dataset"
issue: 9
severity: high
repo: SaoMiguelBus (one optional API addition)
files:
  - features/transit/components/TrackButton.tsx
  - features/transit/lib/schedule-config.ts
  - features/transit/lib/journey-legs.ts
  - features/transit/hooks/useBusTracking.ts
  - features/transit/components/PinnedRoutesSection.tsx
  - features/transit/components/ActiveTrackingSection.tsx
  - lib/profile-store.ts
  - lib/bus-tracking.ts
  - features/transit/lib/user-data-migration.ts
---

# 9 — premium pinning and tracking must work on the new network

> This is the document the report asked to be written on its own. Pinning and
> live tracking are the two things a paying rider gets that a free one does not
> **on the transit tab**, and on the AzoresBus dataset they are currently either
> invisible or half-working. Everything needed is already in the payload: the
> journeys endpoint returns every stop of every leg with a time.

## 1. What premium actually is here, today

Two widgets on the transit tab, both hard-gated on `usePremium()`:

| Widget | File | What it does |
|--------|------|--------------|
| **Active tracking** | [ActiveTrackingSection.tsx](../../../features/transit/components/ActiveTrackingSection.tsx) | Live countdown for a bus you are on or waiting for. Recomputed every 30 s from the stored stop times; expires after 4 h (`ACTIVE_TRACK_TTL_MS`). Max 5 concurrent. |
| **Pinned routes** | [PinnedRoutesSection.tsx](../../../features/transit/components/PinnedRoutesSection.tsx) | A saved shortcut: tap it and the search form is refilled and re-run. No expiry, no cap. |

Both are driven from `TrackButton`
([TrackButton.tsx](../../../features/transit/components/TrackButton.tsx)) — the
pin icon and the location icon that appear in a card's action row — and both are
stored in `profileStore.tracking`
([profile-store.ts:44-73](../../../lib/profile-store.ts#L44-L73)):

```ts
interface ActiveTrack {  id; tripId; routeNumber; origin; destination;
                         searchDay; searchDate; stops: TripStop[];
                         nextDeparture; estimatedArrival; expiresAt; createdAt }
interface PinnedRoute  {  id; tripId; routeNumber; origin; destination;
                         searchDay; stops: TripStop[]; pinnedAt }
```

There is **no push notification** anywhere in this feature — the app does not
depend on `expo-notifications`. Tracking is an in-app countdown. Any product copy
written for this must not promise alerts.

## 2. The four gaps on AzoresBus

### Gap A — the buttons are invisible while previewing (the reported symptom)

```ts
// TrackButton.tsx:56-59
// A previewed timetable is not in force, so there is nothing to track against.
if (!canTrackTrips) {
  return null;
}
```

`canTrackTrips` comes from `canTrack(config, isPreviewing)`
([schedule-config.ts:125-130](../../../features/transit/lib/schedule-config.ts#L125-L130)),
which is `!showPreviewWarning`, which is
`!(phase === 'preview' && previewDataset != null && isPreviewing)`
([schedule-config.ts:103-113](../../../features/transit/lib/schedule-config.ts#L103-L113)).

So **the whole action row disappears the moment a user toggles the AzoresBus
preview on** — which is the only way to see the new dataset before 1 September.
Not just tracking: the pin button lives in the same component and vanishes with
it. A premium subscriber previewing the new network sees a strictly poorer app
than the free one they had in August.

The gate itself is correct for *tracking*: a countdown against a timetable that
is not in force yet would fire on the wrong days, exactly as the comment says.
It is wrong for *pinning*, which stores a search shortcut and schedules nothing.

**Fix:** split the gate.

```ts
// schedule-config.ts
export function canTrack(config, isPreviewing) { /* unchanged */ }

/** Pinning saves a shortcut and schedules nothing, so a previewed timetable is
 *  not a reason to hide it. The pin is re-resolved when it is opened. */
export function canPin(): boolean { return true; }
```

```tsx
// TrackButton.tsx
{canTrackTrips ? <IconButton icon={MapPin} … /> : null}
{showPin ? <IconButton icon={Pin} … /> : null}
```

so the row renders whenever at least one action is available. After 1 September
`canTrackTrips` is true again and this is a no-op — but it is what makes preview
survivable, and the same code path is what a rider hits if we ever arm another
changeover.

### Gap B — a journey can only be pinned one leg at a time

`ShareTripButton` and `TrackButton` are rendered inside `RideLegPanel`, per ride
leg, fed by `rideLegAsTrip(leg, journey)`
([JourneyCard.tsx:355-358](../../../features/transit/components/JourneyCard.tsx#L355-L358)).
The adapter's own module doc states the limit
([journey-legs.ts:9-13](../../../features/transit/lib/journey-legs.ts#L9-L13)):

> on a two-bus itinerary the rider tracks or shares ONE leg, not the whole
> journey. Journey-level tracking needs `lib/profile-store.ts` to grow a
> multi-leg shape, which is separate work.

This is that separate work. Legacy São Miguel had few useful transfers, so
"one trip = one journey" held. AzoresBus is a transfer network — `/journeys`
exists precisely because a two-bus itinerary is a normal answer — and pinning
half of one is close to useless: the rider gets the 110 back, and has to
re-derive the change onto the 205 themselves.

### Gap C — pins survive the cutover pointing at the wrong network

`useUserDataMigration` re-points favourites and recents by **name** when the
dataset changes, precisely because stop PKs are reused across datasets
([user-data-migration.ts:1-25](../../../features/transit/lib/user-data-migration.ts#L1-L25)).
It handles `favoriteStops`, `favoriteRoutes` and `recentSearches`
([lines 161-170](../../../features/transit/lib/user-data-migration.ts#L161-L170)).

It does **not** touch `tracking.pinned` or `tracking.active`. Neither carries a
`dataset` field. So on 1 September a pin created on legacy keeps a `tripId` that
now identifies an unrelated AzoresBus trip, and `origin`/`destination` names that
may not exist in the new network. `PinnedRoutesSection.onSelect(pin.origin, pin.destination)`
([PinnedRoutesSection.tsx:45](../../../features/transit/components/PinnedRoutesSection.tsx#L45))
then runs a search that quietly returns nothing.

Active tracks are self-limiting (4 h TTL) so they age out; **pins do not expire
and have no cap**, so a long-standing subscriber's pinned list silently becomes
dead rows on cutover day. That is the worst possible time for a paying user's
saved data to look broken.

### Gap D — the status strings are hardcoded English

`computeBusStatus` returns `statusLabel` and `countdown` as literals —
`'Waiting to start'`, `'En route'`, `'Approaching'`, `'Arriving soon'`,
`'Route completed'`, `'Departing now'`, `'12 min'`, `'1h 20m'`
([bus-tracking.ts:28-130](../../../lib/bus-tracking.ts#L28-L130)) — and
`ActiveTrackingSection` renders them straight
([ActiveTrackingSection.tsx:56-58](../../../features/transit/components/ActiveTrackingSection.tsx#L56-L58)).
A Portuguese premium subscriber's premium widget is in English. Not AzoresBus-specific,
but it is the same surface and it should be fixed in the same pass — see
[01](01-missing-i18n-keys.md) for the parity rule.

## 3. Design — journey-aware pinning and tracking

### 3.1 Store shape

Widen the two records rather than adding parallel ones, so `pruneTracking`, the
persistence partializer ([profile-store.ts:413](../../../lib/profile-store.ts#L413))
and the export/reset paths keep working unchanged.

```ts
/** One bus within a pinned/tracked itinerary. Mirrors TransitRideLeg, trimmed. */
export interface TrackedLeg {
  tripId: number;
  routeNumber: string;
  /** Board and alight for THIS leg — not the journey endpoints. */
  origin: string;
  destination: string;
  start: string;          // 'HH hMM'
  end: string;
  stops: TripStop[];      // already board..alight-trimmed by the server
  /** Sequences the server chose, so nothing is re-matched by name (98 B7). */
  boardSequence?: number;
  alightSequence?: number;
}

export interface TrackedTransfer {
  at: string;
  from: string;
  waitMinutes: number;
  walkMinutes: number;
  tight: boolean;
}

export interface PinnedRoute {
  id: string;
  /** The journey id when pinned from a journey card; absent for legacy pins. */
  journeyId?: string;
  /** Which network this was created against. Absent = created before this change. */
  dataset?: TransitDataset;
  routeNumber: string;        // "110" or "110 → 205"
  origin: string;             // journey endpoints
  destination: string;
  searchDay: string;
  legs: TrackedLeg[];
  transfers: TrackedTransfer[];
  pinnedAt: number;
  /** Set by the migration when the pin no longer resolves. Shown greyed, never deleted. */
  unavailable?: boolean;

  // --- legacy fields, kept for one release so persisted state still reads ---
  /** @deprecated use legs[0].tripId */ tripId: number;
  /** @deprecated use legs[0].stops */  stops: TripStop[];
}
```

`ActiveTrack` gets the same `legs` / `transfers` / `dataset` treatment, keeping
`expiresAt`, `createdAt`, `searchDate`, `nextDeparture`, `estimatedArrival`.

**Migration of persisted state.** Zustand `persist` is already in use; add a
`version` bump + `migrate` that lifts an old single-trip record into
`legs: [{ tripId, routeNumber, origin, destination, start: nextDeparture,
end: estimatedArrival, stops }]`, `transfers: []`. Do not drop unrecognised
records — a subscriber losing their pins on update is the failure this whole
document is trying to prevent.

### 3.2 Building a pin from a journey

Add next to `rideLegAsTrip`:

```ts
// features/transit/lib/journey-legs.ts
export function journeyAsPinnedRoute(
  journey: TransitJourney,
  searchDay: string,
  dataset: TransitDataset | null,
): Omit<PinnedRoute, 'id' | 'pinnedAt'>
```

Rules:

- `routeNumber` = `journeyRouteLabel(journey, displayRouteNumber)` — already
  written, gives `"110 → 205"`
  ([journey-legs.ts:41-49](../../../features/transit/lib/journey-legs.ts#L41-L49)).
- `origin` = first ride leg's `board.name`; `destination` = last leg's
  `alight.name`. **Not** the search terms: on AzoresBus a search for "Capelas"
  resolves to a village area covering several poles, and storing the query would
  lose which pole the itinerary actually used.
- `legs` from `journeyRideLegs(journey)`, `transfers` from the `transfer` legs.
- Dedup key becomes `(journeyId ?? legs.map(l => l.tripId).join(':'), origin, destination)`
  — the current check is on `tripId` alone
  ([profile-store.ts:320-329](../../../lib/profile-store.ts#L320-L329)) and would
  treat two different itineraries sharing a first bus as duplicates.
- Add a cap. Pins are currently unbounded; `MAX_PINNED_ROUTES = 20` is generous
  and stops a persisted blob growing without limit (each pinned journey now
  carries every stop of every leg).

### 3.3 Tracking a multi-leg journey

`computeBusStatus` assumes one continuous stop list
([bus-tracking.ts:52-130](../../../lib/bus-tracking.ts#L52-L130)). For a journey
it needs to know which leg the rider is on and that the gap between legs is a
**wait**, not a ride.

```ts
export type JourneyTrackPhase =
  | 'waiting'        // before leg 0 departs
  | 'riding'         // on leg i
  | 'transferring'   // alighted leg i, leg i+1 not yet departed
  | 'completed';
```

Compute by walking the legs in order against `now`:

- before `legs[0].stops[0].time` → `waiting`, countdown to that departure;
- inside a leg's span → `riding`, with `currentStop` / `nextStop` from that
  leg's stops (the existing per-leg logic, unchanged);
- between `legs[i].end` and `legs[i+1].start` → `transferring`, countdown to the
  **next** boarding, and surface `transfers[i].tight` — a tight change is the one
  moment this feature is genuinely worth money;
- after the last leg's last stop → `completed`.

Two details the existing code already gets right and that must survive:

- **Day offsets.** `dayOffset > 0` exists on AzoresBus stop refs and the journey
  carries `journey.dayOffset`. `timeStringToMinutes` is minutes-since-midnight
  ([bus-tracking.ts:22-27](../../../lib/bus-tracking.ts#L22-L27)) and
  `segmentStops` **sorts by that value**, which reorders a past-midnight leg
  incorrectly. Carry `dayOffset` into `TrackedLeg.stops` and add
  `dayOffset * 1440` before comparing. This is already latent on legacy night
  buses; a transfer network makes it reachable.
- **TTL.** `ACTIVE_TRACK_TTL_MS = 4 h` was sized for one bus. A journey with a
  50-minute wait can exceed it. Derive the expiry from the itinerary:
  `expiresAt = lastAlightInstant + 30 min`, clamped to a maximum of 8 h.

### 3.4 UI

**Journey card** — one pin and one track action at the **card** level, in the
row that today only holds the show/hide-steps toggle
([JourneyCard.tsx:142-155](../../../features/transit/components/JourneyCard.tsx#L142-L155)).
Keep the per-leg `TrackButton` inside `RideLegPanel` **only** when
`journeyRideLegs(journey).length > 1` — on a direct journey it is a duplicate of
the card-level one.

**Pinned routes section** — a pinned journey needs to show its shape, not just
`origin → destination`:

```
┌─────────────────────────────────────────────┐
│ 110 → 205                              ✕    │
│ Ponta Delgada → Vila Franca                 │
│ 09h15 · 1 mudança em Lagoa · chega 10h21    │
│ [ Ver horários ]        [ Seguir esta ida ] │
└─────────────────────────────────────────────┘
```

- **Ver horários** keeps the current behaviour (`onSelect(origin, destination)`
  refills and re-runs the search) — that is what makes a pin useful the next day,
  when the specific trip ids have rolled.
- **Seguir esta ida** starts tracking directly from the pin, which is the "I take
  this every morning" loop and the single strongest reason to keep the
  subscription. Gate it on `canTrackTrips` — a pin can be *stored* while
  previewing, but a countdown still must not run against a timetable that is not
  in force (Gap A: the gate splits, it does not disappear).

**Active tracking section** — render one row per journey with a leg strip rather
than a single progress bar, so `transferring` is visible:

```
110 ●━━━━━━━━━◐          Lagoa 09h34
     mudança · 14 min de espera
205 ○─────────────        Vila Franca 10h21
```

### 3.5 Cutover safety (Gap C)

Extend `useUserDataMigration` to a fourth resolver:

```ts
// features/transit/lib/user-data-migration.ts
export function resolvePinnedRoutes(
  pinned: PinnedRoute[],
  stops: Stop[],
): MigratablePinnedRoute[]
```

Same policy the favourites resolver already uses, and for the same reasons
stated in that module's header:

- resolve **by name** against the active dataset's stops, treating a village area
  as resolvable (pins store searchable names, exactly like `FavoriteRoute`);
- when a pin's endpoints resolve → clear `unavailable`, stamp the current
  `dataset`, and **drop `legs[].tripId`** (a stale PK from the other network is
  worse than none — the pin's job is to re-run a search, and `Ver horários` needs
  no trip id);
- when they do not resolve → keep the pin, set `unavailable: true`, grey it in
  the list with a tap-to-fix affordance. Never delete.

Also prune `tracking.active` on a dataset change: a countdown built from the old
network's stop times is wrong the instant the network changes, and unlike a pin
it has no useful degraded form. `pruneTracking` already runs every 30 s
([useBusTracking.ts:16-23](../../../features/transit/hooks/useBusTracking.ts#L16-L23))
— give it a `dataset` argument and drop tracks whose `dataset` no longer matches.

## 4. Does the API need anything?

**No, for everything above.** `/api/v3/transit/journeys` already returns each
ride leg's full trimmed stop list with times, `sequence` and `dayOffset`, plus
the transfer's `at` / `from` / `waitMinutes` / `walkMinutes` / `tight`
([services/v3.py:230-290](../../../../SaoMiguelBus-api/src/transit/services/v3.py#L230-L290)).
That is the entire input to both pinning and the countdown.

**One optional addition, worth it if pins are to survive well:** a way to
re-resolve a pinned itinerary to *today's* trips in one call, rather than
re-running a full O→D search and hoping the same shape comes back first.

```
GET /api/v3/transit/journeys/resolve
    ?origin=&destination=&routes=110,205&day=&start=
→ the journey matching that route sequence for the requested day, or 404
```

It is a filter over the existing search, not new planning. Without it, **Seguir
esta ida** has to run a normal search and pick the journey whose route sequence
matches — workable, and the right thing to ship first.

## 5. Sequencing

| Step | Change | Ships |
|------|--------|-------|
| 1 | Split `canTrack` / `canPin`; render the action row when either is available (Gap A) | immediately — one file, unblocks preview testing |
| 2 | Localise `computeBusStatus` (Gap D) | with 1 |
| 3 | Store shape + persist migration (§3.1) | next |
| 4 | `journeyAsPinnedRoute`, card-level pin/track, dedup + cap (§3.2, §3.4) | with 3 |
| 5 | Multi-leg `computeJourneyStatus`, `dayOffset` correctness, derived TTL (§3.3) | with 4 |
| 6 | `resolvePinnedRoutes` + active-track pruning on dataset change (§3.5) | **before 1 September** — this one is dated |
| 7 | Optional `/journeys/resolve` endpoint (§4) | after |

Steps 1–2 are worth landing on their own: they are small, and until they land no
one can test premium behaviour on the AzoresBus dataset at all.

## 6. Verification

- Toggle the AzoresBus preview on as a premium user: the pin button is present on
  every result card; the track button is hidden with an explanation, not silently.
- Pin a two-bus journey: the pinned row names both routes and the change; opening
  it re-runs the search and the same itinerary is in the results.
- Track a two-bus journey across a real change: the widget moves
  `waiting → riding → transferring → riding → completed`, and the transferring
  state counts down to the **second** boarding.
- Track a journey whose last leg crosses midnight: the countdown does not jump
  backwards (the `dayOffset` case).
- Simulate the cutover (`schedule-dev-store` phase simulation): pins created on
  legacy either re-resolve or are greyed as unavailable — none disappear, and
  none silently return an empty search. Active tracks are cleared.
- Free user: every one of these actions opens the paywall via
  `guardPremiumAction`, and none of the widgets render.
