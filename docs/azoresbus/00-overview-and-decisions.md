## title: "AzoresBus changeover — overview and load-bearing decisions"
status: draft
date: 2026-08-13
target_repos:
  - SaoMiguelBus-api
  - SaoMiguelBus

# Overview and load-bearing decisions

## The requirement, restated

On **1 September 2026** São Miguel's bus network is replaced by the AzoresBus
concession: 55 new routes, new numbering, a new 1456-stop network, new fares. The app
must handle three phases:

---


| Phase       | Dates                   | Behaviour                                                                                                                                      |
| ----------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Preview** | now → 2026-08-31        | Legacy timetables by default. Top banner with a toggle to preview the new ones. Preview results carry a "only valid from 1 September" warning. |
| **Live**    | 2026-09-01 → 2026-09-30 | New timetables **only**. Top banner announcing they are live. Persistent "Valid since 1 September" badge.                                      |
| **Settled** | 2026-10-01 →            | Banner auto-hides. New timetables only. Badge retires with the banner.                                                                         |


The binding constraint: **this must happen without an app update**. A user who
installed the app in June and never updates must still see the correct timetables on
1 September.

---



## Decision 1 — the cutover lives on the server, not in the app

**The app ships no dates.** Not `2026-09-01`, not `2026-10-01`, nowhere.

`/api/v3/bootstrap` grows a `transitSchedule` block that states which dataset is
active, whether preview is offered, what the banner says, and when it retires. The app
renders that block. It does not compute it.

```jsonc
"transitSchedule": {
  "activeDataset":  "azoresbus",     // what search returns by default, today
  "previewDataset": null,            // set to "azoresbus" during the preview phase
  "cutoverDate":    "2026-09-01",
  "phase":          "live",          // preview | live | settled
  "banner": {
    "id": "azoresbus-live-2026-09",
    "tone": "info",
    "dismissible": false,
    "text": { "pt": "…", "en": "…" }
  },
  "badge": { "text": { "pt": "Válido desde 1 de setembro", "en": "Valid since 1 September" } }
}
```

Why this and not a client-side date check:

- **It survives a schedule slip.** If the concession start moves to 15 September we
change one admin field. A hardcoded client date would strand every installed build.
- **It survives stale installs.** Old builds get the right data because they never
had the decision to make.
- **The banner copy is editable** without a release — genuinely useful in week one
when something inevitably needs clarifying.

The one thing the client keeps locally is the *offline* fallback (Decision 4).

## Decision 2 — `dataset` version tag, and unversioned requests resolve by date

Add a `dataset` tag (`legacy` | `azoresbus`) to `Line`, `Trip`, and `Stop`, defaulting
to `legacy` so every existing row and query keeps working untouched.

The resolution rule for `GET /api/v3/transit/search`:


| Request              | Resolves to                                           |
| -------------------- | ----------------------------------------------------- |
| no `dataset` param   | **the date-appropriate dataset, decided server-side** |
| `?dataset=azoresbus` | new network (used by the preview toggle)              |
| `?dataset=legacy`    | outgoing network (admin/debug only)                   |


The default is the important one. It is what makes a June build correct in September.

> **Trap worth naming:** if we merely *added* the new rows without a filter, every
> existing client would suddenly receive both networks interleaved — 55 new routes
> mixed into the old ones, with overlapping stop names. The `dataset` filter is not a
> nicety, it is what keeps the addition safe.

Stops get the same treatment: `GET /api/v3/transit/stops` returns the active dataset's
stops so the origin/destination pickers stop offering stops that no longer exist.

## Decision 3 — one sync, both periods, driven by `?day=`

Upstream already serves both periods from one endpoint, parameterised by date
([01 §4.3](01-upstream-api-reference.md)). We do not need a "new timetables" feed and a
"legacy" feed. We sync the AzoresBus network once, using three canonical dates to pull
the three service patterns, and store them against our existing
`Calendar` rows (`WEEKDAY`/`SATURDAY`/`SUNDAY`) — which match upstream's behaviour
exactly, holidays included.

Legacy data stays exactly where it is, retagged `dataset='legacy'`. Nothing is deleted:
after cutover it is still queryable for support ("what did the 08:15 used to do?").

## Decision 4 — the offline bundle carries **both** datasets and the cutover date

This is the subtle one. A Premium user offline on the night of 31 August must wake up
on 1 September to the new timetables — with **no network call available** to tell them
the phase changed.

So the bundle ships:

- routes for **both** datasets, each row tagged
- the `cutoverDate`
- the banner/badge copy for all phases

and `offlineSearch()` picks the dataset by comparing the device date to the bundled
`cutoverDate`. The device clock is the only input available offline, and it is
sufficient — a wrong device clock degrades to showing the other network, not to
showing nothing.

Online, the server's answer always wins. Offline, the bundle self-resolves.

## Decision 5 — build live tracking now, ship it dark

`https://azb.elevensystems.pt/api/locations` already answers `200 []`
([01 §6](01-upstream-api-reference.md)). The payload shape is confirmed from the live
PDL Mini Bus deployment, which is the **same vendor and the same shapes**.

So: build the client, the cache layer, the API endpoints, the map screen and the
vehicle sheet — all mirroring `src/minibus/` and `features/minibus/` — and gate the
whole thing on a server flag (`Island.feature_flags['azoresbusTracking']`, surfaced in
bootstrap as `trackingEnabled`). The day the fleet starts reporting we flip one boolean
and it appears in every installed build.

---



## Sequencing

The two repos are independently deployable; the app degrades gracefully against an
un-migrated API (absent `transitSchedule` → behave exactly as today).

```
Week 1   API   schema + dataset tag + migration retagging legacy rows
         API   sync worker + rate limiter + gateway path, run manually
Week 1   APP   bootstrap type + phase hook, feature-detected (no UI yet)

Week 2   API   bootstrap.transitSchedule, date-resolved search, versioned stops
         API   tariffs sync + /api/v3/transit/tariffs
         APP   banner + preview toggle + badge, wired to the real payload
         APP   pricing screen

Week 3   API   offline bundle carries both datasets; bundle version includes phase
         API   tracking client + endpoints, flag OFF
         APP   offline dual-dataset search; tracking screens behind trackingEnabled

Week 4   ---   soak: preview phase live in production, cron running weekly
         ---   dry-run the cutover by moving cutoverDate on staging
```

**Hard deadline is the preview banner, not the cutover** — the preview phase only has
value while it is still August.

---



## Risk register


| Risk                                                           | Impact                         | Mitigation                                                                                                                     |
| -------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Upstream blocks our datacenter IPs, as it already does for PDL | Sync fails silently            | Route through the existing Tailscale Pi proxy from day one ([02 §5](02-backend-plan.md)); alert on sync age                    |
| Fleet never reports on `/api/locations`                        | Tracking stays dark            | It is already dark by design; zero user-visible impact                                                                         |
| Stop-name collisions between the two networks                  | Wrong results, bad pickers     | `dataset` is part of the stop uniqueness key ([02 §3.2](02-backend-plan.md))                                                   |
| **First-occurrence stop matching drops valid trips on the 13 routes that revisit a stop name** (route 335 revisits 37 of 97) | **Loop and circular routes silently return no results** | **Sequence-based pair selection replaces `find()`/`indexOf()` in both the API and the offline client ([02 §3.3](02-backend-plan.md), [03 §5b](03-mobile-plan.md))** |
| 1456 stops collapse to 816 names, losing which side of the road | Wrong map marker, no way to resolve live `currentStopSequence` | `StopTime.external_stop` FK keeps the pole per trip; picker stays collapsed ([02 §3.2](02-backend-plan.md)) |
| 1456 stops × 895 journeys bloats the offline bundle            | Premium download too large     | Stop-ID references instead of repeated names + gzip; measure before shipping ([02 §7](02-backend-plan.md))                     |
| Upstream data still churning right up to 1 September           | We serve a stale September     | Weekly cron is too slow in the final fortnight — raise to daily for late August, drop back after ([02 §4](02-backend-plan.md)) |
| Concession start slips                                         | Wrong network shown on the day | Server-driven dates (Decision 1) — one admin edit                                                                              |
| Device clock wrong while offline                               | Wrong network offline          | Bounded: shows the other dataset, never an empty app; server corrects on reconnect                                             |


---



## Explicitly out of scope

- **Real-time arrival predictions.** Upstream exposes vehicle position and
`currentStopSequence`, not predicted arrivals. ETAs would be ours to compute — a
separate piece of work, and one the PDL Mini Bus feature already has an
implementation of (`features/minibus/lib/liveEtas.ts`) to borrow from later.
- **Ticketing / card top-ups.** No upstream API.
- **Migrating the legacy network away.** It stays, retagged.
- **The webapp (**`SaoMiguelBus-webapp`**).** These plans cover the Django API and the Expo
app, as asked. The webapp consumes the same versioned endpoints and will need its own
(smaller) pass — the API work here is what unblocks it.

