---
title: "Upstream API reference — azb.elevensystems.pt + azoresbus.pt"
status: verified
date: 2026-08-14
revision: 2
supersedes: 2026-08-13 draft
verified_against: live upstream 2026-08-13, corrected against 98-review-findings.md (2026-08-14)
---

# Upstream API reference (reverse-engineered)

Probed live, no auth, no API key, plain `GET`, JSON responses, ASP.NET Core backend
(RFC 9110 problem+json on errors).

> **Corrections in this revision come from [98-review-findings.md](98-review-findings.md)**,
> which ran ~1,500 serial GETs on 2026-08-14 — including a full 55-route Mon–Sun sweep
> that the 2026-08-13 probe did not do. Where this file and `98` disagree, `98` wins.
>
> **Do not re-probe to confirm these numbers.** The measurements exist. Hammering
> `azb.elevensystems.pt` before we have a proxy path and a `User-Agent` is how we get
> blocked.

> The vendor is **Eleven Systems** — the same vendor already powering PDL Mini Bus
> live tracking (`pdl.elevensystems.pt/publicapi`). Payload shapes are shared between
> the two deployments, which is why we can build AzoresBus tracking before it goes live.

---

## 0. Naming: route id vs line number

Two different namespaces, and the 2026-08-13 draft conflated them (`98` claim 9).

- **`id`** — the upstream route primary key used in URL paths: `/api/routes/25/journeys`.
- **`nameShort`** — the **public line number** printed on the bus: `301`.

Route **id `25` is public line `301`**. Route id `31` is line `307`; id `9` is line `112`;
id `41`/`44`/`45`/`47` are lines `321`/`324`/`325`/`328`. Throughout this plan set,
"line 301" means `nameShort`, and "route id 25" means the path segment. Never write
"line 25".

---

## 1. Hosts and base paths

| Host | Base | Purpose |
|------|------|---------|
| `azb.elevensystems.pt` | `/api` | Schedules, stops, routes, **live vehicle locations** |
| `azoresbus.pt` | `/static/json` | Tariffs |
| `pdl.elevensystems.pt` | `/publicapi` | Existing PDL Mini Bus AVL (reference shape only) |

Note the path difference: PDL uses `/publicapi/locations`, AzoresBus uses **`/api/locations`**.
This matters for the proxy config (see [02 §5](02-backend-plan.md)).

**CORS and rate-limit headers.** With an `Origin` header, both `azb` and `pdl` return
`Access-Control-Allow-Origin: *`. `azoresbus.pt/static/json/tariffs.json` does **not**.
No `Retry-After` and no `X-RateLimit-*` on any host, at any observed rate (`98` §6).
Absence of a published limit is not permission — see [02 §4.3](02-backend-plan.md).

---

## 2. `GET /api/stops`

Returns **1456** stops.

```json
[ { "id": "167", "name": "ACHADA (PRAÇA)", "nameShort": "6014",
    "position": { "lat": 37.851258, "lon": -25.266083 } } ]
```

**Measured** (`98` claim 1, confirmed): 1456 stops → **816 distinct `name` values**, of
which **635 carry more than one stop code**. The breakdown, stated so it cannot be
misread: **181 singletons + 630 pairs + 5 triples = 816 names**; the 630 + 5 = 635 are
the multi-code names.

The duplicates are the two sides of a road, and they are tightly clustered
(`98` claim 2 — the 2026-08-13 numbers were rounded, these are the measured ones):

| Measure | Value |
|---------|-------|
| Median separation within a duplicate name | **11.5 m** |
| Mean | **16.5 m** |
| Max | **164.1 m** |
| Groups > 250 m apart | **0** |
| Groups > 100 m apart | **3** |
| Groups > 75 m apart | **14** ← *not 30* (`98` §3) |
| Pairs with consecutive integer codes | **629 of 630** |

Worst three: `COVOADA (AV. 6 DE JANEIRO)` **164.1 m**,
`PONTA DELGADA (ALFÂNDEGA)` **134 m**, `P. DELGADA (FORTE S. BRÁS)` **108 m**.

The single non-consecutive pair is `CAPELAS (LG. TEATRO NOVO)`, codes `1268` / `1270` —
a skipped integer, and the two poles are **18.4 m** apart, so it is still a road pair
(`98` claim 3). No same-name group in the network looks like two genuinely different
places; even the 14 far groups have consecutive or `+2` pole codes.

**No accessibility fields exist upstream** — no shelter, kerb, or step-free attribute
anywhere in the stop payload (`98` §5 challenge 3).

### 2.1 The pair is selected by direction of travel

Comparing both directions of the same route, the two codes are **not interchangeable** —
each direction serves its own pole (`98` claims 4, 5, confirmed):

| Route | Names served both ways | Different code per direction |
|-------|------------------------|------------------------------|
| 101 | 27 | **24** |
| 102 | 14 | **10** |

e.g. `PONTA DELGADA (ALFÂNDEGA)` is code `1002` in direction 0 and `1001` in direction 1.

Which of the pair is the lower number is **not** consistent — route 101 direction 0 takes
the lower code in only 14 of 27 comparable names — so side cannot be inferred from the
code. It must be read from `circulations[].stage.id` on the journey.

**Consequence:** the user never needs to pick a side — the trip's direction determines
it. See [02 §3.2](02-backend-plan.md) and [03 §5b](03-mobile-plan.md).

`GET /api/stops/{id}` → **404**. There is no per-stop endpoint.

---

## 3. `GET /api/routes?active=true&passengerInfo=true`

Returns **55** routes.

```json
[ { "id": "1", "name": "P. DELGADA - RIBEIRINHA", "nameShort": "101",
    "color": "1C4DA1", "isActive": true } ]
```

`nameShort` is the public line number and the natural stable key:

```
101 102 103 105 108 109 110 111 112
200 202 203 205 206 208 210 211 212 216 217 218 219 221 222
301 302 303 304 305 306 307 311 312 313 314 315 316 317 318 319
321 322 323 324 325 326 328 335
E01 E02  N01 N02 N03 N04 N05
```

Three `color` values only: `1C4DA1` (blue), `00A7E2` (cyan), `A5CE44` (green) — these
correspond to the 1xx/2xx/3xx service families.

### 3.1 `isActive` is a **display flag**, not a service predicate

> **Correction.** The 2026-08-13 draft treated `?active=true` as a filter and read
> `isActive` as "has service". Both are wrong (`98` **B5**).

`?active=true`, `?active=false`, and **no parameter at all** return the **same 55
objects** (5878 B in every case). The parameter is ignored, like every parameter except
`day`. Five of the 55 carry `"isActive": false`:

| Line | Route id | Wed 2026-09-02 (pre-term) | Term week 2026-09-14…20 | Reality |
|------|----------|---------------------------|--------------------------|---------|
| 112 | 9 | 0 | **2** on Tue and Thu (`236`, `237`) | school-term, Tue/Thu only |
| 321 | 41 | 0 | **2** (`898`, `899`) Tue/Wed/Thu | school-term |
| 324 | 44 | 0 | **6** (`926`–`931`) Tue/Wed/Thu | school-term |
| 325 | 45 | 0 | **2** (`932`, `933`) Tue/Wed/Thu | school-term |
| 328 | 47 | 0 | 0 on weekdays | **weekend-only**, 4 journeys ids `942`–`945` |

**Honouring `isActive` drops line 328 entirely.** Import journeys for **every** listed
route. And note that an unfiltered `/journeys` call (no `?day=`) returns **today's** set,
not the route's catalogue — `/api/routes/1/journeys` returned 8 ids on a Friday.

### `GET /api/routes/{id}`

Superset of the list entry, plus:

- `shape` — **encoded polyline** for the whole route (Google polyline algorithm, ~844 chars for route 1)
- `stops[]` — union of all stops served across both directions, each `{ sequence: 0, stage: {...}, departureTime: 0, arrivalTime: 0 }`

`sequence`/times are **zeroed** here (`98` claim 16, confirmed: route 1 → 74 stops, all
zeroed) — this endpoint gives you the stop *set* and the shape, not an ordering. Use
journeys for ordering.

We already decode polylines client-side (`lib/polyline.ts`) and store route shapes
server-side (`MinibusLine.route_shapes`), so this drops straight in.

---

## 4. `GET /api/routes/{routeId}/journeys`

```json
[ { "id": "1", "name": "17:15  »  17:55", "start": "17:15:00", "end": "17:55:00",
    "startTime": 62100, "endTime": 64500,
    "direction": 0, "isActive": false, "type": "scheduled" } ]
```

- `startTime`/`endTime` — **seconds since midnight** (62100 = 17:15). See §4.6 — they
  **wrap** past midnight, they do not exceed 86400.
- `direction` — `0` or `1`.
- `type` — `"scheduled"` for all AzoresBus journeys. (PDL Mini Bus also emits `"frequency"`.)
- `isActive` — a real-time "running right now" flag; always `false` in the schedule
  listing. Unrelated to the route-level `isActive` in §3.1.

The listing has **no `shape` and no `circulations`.** That matters for the sync design:
you cannot know a journey's detail hash without fetching the detail
([02 §4.4](02-backend-plan.md)).

### 4.1 The `?day=` parameter

`day` is the **only** query parameter the endpoint binds. Everything else
(`direction`, `type`, `active`, `weekday`, `serviceDay`…) is silently ignored — verified
by sending `?direction=abc`, which returns `200` with the full unfiltered list (8
journeys, today's weekday set), whereas `?day=abc` returns `400` (`98` claim 7):

```json
{ "status": 400, "errors": { "day": ["The value 'abc' is not valid."] } }
```

It accepts an **ISO date**, not a weekday name (`98` claim 8):

| Value | Result |
|-------|--------|
| `2026-09-01` | `200` — journeys valid that date |
| `Monday`, `monday`, `1`, `0`, `Sunday` | `400` |
| `1970-01-01T00:00:00` | `200`, empty list |

**Observed data floor: 2026-07-27.** `?day=2026-07-25` and `2026-07-26` return `[]`;
07-27 onward is populated. Dates further back (`2026-04-05`, `2026-06-10`,
`2026-06-11…14`) return `[]` because **the feed has no data that far back**, not because
of any holiday semantics — `?day=2027-06-10` (Portugal Day) returns the Sunday set
(`98` §4 gap "Empty-before-window").

### 4.2 Service calendar — weekday-specific **and** school-term/seasonal

> **This section replaces the 2026-08-13 "exactly three patterns, full stop, maps 1:1
> onto `transit.Calendar`". That claim is false** (`98` **B0**). It was produced by a
> Wed/Sat/Sun-only sample of routes 101/301/335. A full Mon–Sun sweep of all 55 routes
> disproves it.

**Two independent axes of variation exist.**

**Axis 1 — school term vs summer.** Line 307 (`routeId=31`):

| Date | Role | n | first | extras vs summer |
|------|------|---|-------|------------------|
| 2026-08-31 / 09-02 / 09-11 | pre-term | **33** | 07:30 | — |
| **2026-09-14** (Mon) | term starts | **38** | 07:00 | ids `633, 645, 647, 661, 662` |
| 2027-01-11 | winter | **38** | 07:00 | same extras |
| 2027-07-12 | summer | **33** | 07:30 | extras gone |

**A sync that resolves "next Wednesday after 1 September" lands on 2026-09-02 and stores
the *summer* 307 timetable.** From 14 September the live network has five school runs the
app would not have.

**Axis 2 — per-weekday sets.** Week 2026-09-14…20, all 55 routes swept:

| Line | Mon | Tue | Wed | Thu | Fri | Sat | Sun |
|------|-----|-----|-----|-----|-----|-----|-----|
| 102 | 27 | 27 | 28 (id `1009`) | 27 | 28 (id `1011`, **a different journey**) | 13 | 12 |
| 112 | 0 | **2** (`236`,`237`) | 0 | **2** | 0 | 0 | 0 |
| 315 | 24 | 24 | **23** | 24 | 24 | 9 | 7 |
| 318 | 12 | 12 | 12 | 12 | 12 **with different ids** vs Mon–Thu | 8 | 8 |
| 307 | 38 | 38 | 38 | 38 | 38 | 13 | 0 |

Note 102: the Wednesday extra (`1009`) and the Friday extra (`1011`) are **different
journeys**, so "Wednesday represents all weekdays" fails even on journey count parity.

**Lines the 2026-08-13 draft called empty are school-term lines**, not unloaded:
`321` (ids 898–899), `324` (926–931), `325` (932–933) all populate Tue/Wed/Thu of the
14 September week and were empty on 2026-09-02 and 2027-07-07. `112` is Tue/Thu only.
All four carry `isActive: false` — see §3.1.

**Holidays.** Every holiday probed returns the **Sunday** set with zero new journey IDs:
2026-08-15, 2026-10-05, 2026-12-01, 2026-12-08, 2026-12-25, 2027-01-01, 2027-04-04
(Easter), 2027-06-10. Our `get_type_of_day` (`transit/services/search.py:11–19`) applies
the same rule and still matches upstream — it is **necessary but not sufficient**
(`98` §6). Note the trap this creates for sampling: **2026-12-01 and 2026-12-08 are
weekdays that return Sunday sets**, so a weekday sample must skip them
([02 §4.1](02-backend-plan.md)).

**Three lines really are Wed≈weekday / Sat / Sun.** Across a 51-date sweep, `101`, `301`
and `335` behave exactly as the 2026-08-13 draft described. **Do not generalise from
them** — `307`, `102`, `112`, `315`, `318`, `321`, `324`, `325` do not (`98` §6).

**What this means for the schema.** `transit.Calendar`'s three values
(`transit/models.py:23–31`) cannot represent this network. We need per-journey operating
**weekdays** plus **date ranges** (or explicit operating dates collected by sampling),
and search plus the offline bundle must answer *"does this trip run on **this ISO
date**?"* Schema in [02 §3.3](02-backend-plan.md), sampling in [02 §4.1](02-backend-plan.md).

**Still unknown:** the exact school-term start and end dates beyond the observed
2026-09-14 flip and the summer-2027 reversion (`98` §7). **14 September is observed, not
official.** Do not hardcode it as *the* term start without saying so.

### 4.3 There is **no** outgoing-operator feed on this host

> **This section replaces the 2026-08-13 §4.3 "The September change is real and already
> served" and its sentence "Dates before the concession start return the outgoing
> operator's service". Both are false** (`98` **B1**, claim 11).

The draft's proof was route id 25 (**line 301**), Sat 2026-08-15 (8 journeys, first
08:00) vs Sat 2026-09-05 (10 journeys, first 06:30). **2026-08-15 is Assumption Day** —
it is a holiday, so it returns the *Sunday* set (ids 515–522), identical to 2026-09-06.
It is not a pre-cutover snapshot of anything.

Non-holiday Saturdays before 1 September already return the September data:

| Date | Weekday | Route id 25 / line 301 | First | IDs |
|------|---------|------------------------|-------|-----|
| 2026-07-25 | Sat | `[]` | — | — |
| 2026-07-26 | Sun | `[]` | — | — |
| **2026-07-27** | Mon | populated | — | **observed validity floor** |
| 2026-08-08 | Sat | 10 | 06:30 | 505–514 |
| 2026-08-15 | Sat **+ holiday** | 8 | 08:00 | 515–522 (**Sunday** set) |
| 2026-08-22 | Sat | 10 | 06:30 | 505–514 |
| 2026-08-29 | Sat | 10 | 06:30 | 505–514 |
| 2026-09-05 | Sat | 10 | 06:30 | 505–514 |

`GET /api/routes/25/journeys?day=2026-08-22` returns the same 10 journeys, same 1591-byte
body, as `?day=2026-09-05`.

**Implication:** do **not** attempt to sync a "legacy period" from this host — there is
none. `?day=` selects *which AzoresBus journeys run that ISO date*, driven by weekday and
season (§4.2), **not** by concession. Legacy timetables stay in our own DB, retagged
`dataset='legacy'` ([00 Decision 3](00-overview-and-decisions.md)).

### 4.4 Network size (measured)

> **Correction.** The 2026-08-13 figure of "895 unique journeys" came from a
> Wed/Sat/Sun-only sweep and is an undercount (`98` §3).

Full 55-route sweep of **Mon–Sun, 2026-09-14…20** (inside school term):

- **989 unique journey IDs**, highest observed journey ID `1259`
- **Six IDs appear only on non-Wednesday weekdays**: `136`, `236`, `237`, `864`, `1011`,
  `1222` — the direct disproof of "Wednesday represents the weekday pattern"
- 12 routes run no service on Sundays
- **270 IDs between 1 and 1259 were never observed.** Unexplained. There is no global
  journey index: `/api/journeys` → 404, and `/api/journeys/488` → 404 (only the
  route-scoped `/api/routes/{r}/journeys/{j}` works). Historical or deleted journeys
  remain the plausible explanation, but it is a guess (`98` §7).

Journey IDs are **globally unique across routes**, not per-route. They are **not**
partitioned by day-type — a journey can appear on several dates, which is exactly what
makes the weekday-mask model work.

**A journey ID is not a stable content key across a republish.** IDs 505–514 held from
2026-08-08 to 2026-09-05, but that window contains no known timetable rewrite. Assume
either reuse (hash misses an update) or reallocation (orphaned rows) is possible and log
`id → (start, end, route)` diffs (`98` §7).

### 4.5 Network topology — loops and revisited stops

The 2026-08-13 figures below came from **one journey per route**. That sample is a
**lower bound**, not the route's behaviour (`98` claim 12).

- **10 routes are single-direction:** `221`, `222`, `301`, `303`, `305`, `306`, `323`,
  `335`, `N01`, `N03`
- **Loops** (first and last stop share a name): `301` (59 stops), `303` (59), `306` (43),
  `323` (17), `N03` (47). **Plus:** `328` is a **weekend** loop, and `305` **journey
  `608`** is a loop even though route 305's first journey is not
- **13 routes revisit a stop name within one journey**, in the first-journey sample:

| Route | Repeated names | Journey length |
|-------|----------------|----------------|
| 335 | **37 extra visits** (36 repeating names) | 97 |
| 301, 303 | 14 | 59 |
| N01 | 14 | 68 |
| 306 | 9 | 43 |
| N05, N03 | 3 | 54, 47 |
| 105, 323 | 2 | 102, 17 |
| 108, 110, 202, 312 | 1 | 75, 69, 27, 52 |

**`335` is not a loop** — it is a 97-stop route with 36 repeating names and 37 extra
visits. **`102` and `305` also repeat on journeys other than their first.** Treat "13
routes" as a floor and write the matcher for the general case.

This matters far more than it looks: any origin/destination matcher that resolves a stop
by **first occurrence** will reject valid trips on these routes. **Three** of our
implementations do exactly that — `transit/services/search.py:106`,
`lib/offline-bundle.ts:218`, and the app's `lib/transit-format.ts:172–199` — so fixing
only the server changes nothing (`98` **B7**). See [00 Decision 5](00-overview-and-decisions.md),
[02 §3.4](02-backend-plan.md), [03 §5c](03-mobile-plan.md).

### 4.6 Times **wrap** past midnight — they never exceed 86400

> **This section replaces the 2026-08-13 §4/02 §4.2 assumption that `departureTime` can
> exceed 86400 and should be converted with `divmod(seconds, 86400)`. That branch never
> fires** (`98` **B2**).

Measured: **zero** `departureTime` or `arrivalTime` values above 86400 anywhere. Max on a
55-route canonical listing is `86340`; max in night-route details is `86369`.

Past midnight is encoded as a **wrap to zero within the same journey**. N03 journey `984`
(`GET /api/routes/53/journeys/984`):

- `start: "23:15:00"`, `startTime: 83700`
- `end: "00:10:00"`, `endTime: **600**` ← *smaller than `startTime`*
- circulations: seq 42 departs `86341` → seq **43** (`RELVA (CANTO DA PIA)`) departs
  **`0`** → seq 47 departs `600`

**Detection rule:** a wrap has occurred when `departureTime` **decreases** as `sequence`
increases. From that point on, the stop is on the next calendar day.

Not every midnight-adjacent journey is a wrap: N02 has a separate journey with
`startTime: 0`, `endTime: 3900` sitting next to 21:50 and 22:55 journeys. That is a
**second journey starting at 00:00**, not a continuation. Distinguish them by whether the
decrease happens *within* one journey's circulations.

Storage and ordering implications are in [02 §4.2](02-backend-plan.md): `StopTime` is
still a `TimeField` (`transit/models.py:114`), so a `day_offset` column is required, and
every ordering must use `(day_offset, time)` or `sequence` — **never a bare `TimeField`
sort**.

---

## 5. `GET /api/routes/{routeId}/journeys/{journeyId}`

The journey listing entry plus `shape` (encoded polyline) and `circulations[]`:

```json
{ "id": "1", "direction": 0, "type": "scheduled",
  "start": "17:15:00", "startTime": 62100, "shape": "qsieFdwt{Cw@aD…",
  "circulations": [
    { "sequence": 1,
      "stage": { "id": "181", "name": "PONTA DELGADA (ALFÂNDEGA)", "nameShort": "1002",
                 "position": { "lat": 37.737628, "lon": -25.67039 } },
      "departureTime": 62100, "arrivalTime": 62100 } ] }
```

`circulations[].stage` is a full inline stop object — the sync does **not** need to
cross-reference `/api/stops` to build stop times, though we still want `/api/stops` for
the stops that no journey serves.

Route 1 journey 1 has 36 circulations; route 1's `/api/routes/1` reports 74 stops across
both directions.

**This is the only place shape and circulations exist.** The listing (§4) has neither —
which is why a stored content hash cannot let the sync skip the detail GET
([02 §4.4](02-backend-plan.md)).

---

## 6. `GET /api/locations` — live tracking, endpoint live, fleet empty

```
GET https://azb.elevensystems.pt/api/locations   →  200  []
GET https://azb.elevensystems.pt/api/locations/1 →  404  (problem+json)
```

**The endpoint exists and answers.** It returns an empty fleet because AzoresBus vehicles
are not reporting yet. `/publicapi/locations` on this host is `404` — the path differs
from PDL.

The payload shape is known from the live PDL deployment (~9–10 vehicles at probe time).
**The list and detail shapes are different key sets** — the 2026-08-13 draft blurred them
(`98` claim 14).

**List** — exactly four keys, `color, id, position, status`:

```json
[ { "id": "11010934", "position": { "lat": 37.744548, "lon": -25.660753 },
    "status": "ontime", "color": "EC6E00" } ]
```

**Detail** (`/locations/{id}`) — exactly nine top-level keys: `currentStopSequence`,
`fleetId`, `id`, `journey`, `licensePlate`, `position`, `route`, `speed`, `status`:

```json
{ "id": "11010934", "fleetId": "25", "licensePlate": "",
  "position": { "lat": 37.743718, "lon": -25.665714 },
  "speed": 2.8115294, "status": "incomingAt", "currentStopSequence": 20,
  "route": { "id": "4", "name": "LINHA D - LARANJA", "nameShort": "D",
             "description": "…", "color": "EC6E00", "isActive": false },
  "journey": { "id": "5", "type": "frequency", "shape": "myieFvut{C…",
               "circulations": [ … 23 entries … ] } }
```

Note there is **no `color` on the detail object** — it lives on `detail.route.color`. A
map marker built from the list payload and a sheet built from the detail payload read
colour from different places.

`route` and `journey` are the *same shapes* as §3/§5, so a single set of serializers
covers schedule and tracking.

Observed `status` values so far: `ontime`, `incomingAt`. Treat as an open enum.

---

## 7. `GET https://azoresbus.pt/static/json/tariffs.json`

**32 066 bytes.** Serves `Last-Modified` and `ETag` — use them for the "last updated"
requirement rather than inventing a timestamp (`98` claim 15, confirmed):

```
last-modified: Wed, 05 Aug 2026 13:47:25 GMT
etag: "80d474f2e024dd1:0"
```

No `Access-Control-Allow-Origin` on this host, unlike `azb`/`pdl` — a browser cannot
fetch it directly, so the API must proxy it.

```json
{ "date": "2026-09-01",
  "comment": "A aquisição do cartão do passe terá um custo de 6€.\n…",
  "categories": [ … ],
  "infos": [ … ] }
```

`date` is the **"data em vigor"** (effective date) — already `2026-09-01`, confirming
this file describes the new concession's fares.

### Structure

`categories[] → groups[] → tariffs[] → prices[]`. **Four** categories today:

| Category | Tariffs | Shape |
|----------|---------|-------|
| Passes Mensais | 4 | 3 × distance-banded (37 prices), 1 × flat |
| Passe Sociais | 2 | flat, €0.00 |
| Pré-Comprados Diários | 4 | flat (1/2/3/5 dias — €7/12/16/25) |
| Pré-Comprado Multiviagens | 1 | distance-banded (37 prices) |

Two price shapes, distinguished by the presence of `fareUnitType`:

```json
{ "name": "Mensal", "fareUnitType": "km", "comment": "…",
  "prices": [ { "fareUnits": "0 a 5", "price": 31.75 }, { "fareUnits": "6 a 7", "price": 36.90 } ] }

{ "name": "1 Dia", "comment": "…", "prices": [ { "price": 7.0 } ] }
```

**All 148 `fareUnits` values are strings** — human-readable band labels (`"0 a 5"`,
`"6 a 7"`, `"8"`), never numbers. Do not parse them into numeric ranges; store verbatim
and render. This is the main reason the storage model stays schemaless
([02 §6](02-backend-plan.md)).

> **`fareUnitType: "km"` is not a price calculator.** Nothing in `/api/stops`, the
> journeys, or `tariffs.json` gives kilometres between two stops. Encoded shapes exist
> but nothing in this plan computes path length. The pricing page renders **tables**;
> "what will *this* ride cost?" cannot ship from this data (`98` §4 gap "Fare distance",
> [00 Product cuts](00-overview-and-decisions.md)).

There is also a top-level `infos[]` array of link-outs, which the pricing page should render:

```json
"infos": [ { "text": "Para mais informação sobre a aquisição de títulos…",
             "url": "https://azoresbus.pt/downloads/docs/Info_passes.pdf" } ]
```

---

## 8. Endpoints that do **not** exist

Probed and confirmed `404` — all 20 paths: `/api`, `/api/vehicles`, `/api/fleet`,
`/api/lines`, `/api/calendars`, `/api/services`, `/api/gtfs`, `/api/alerts`,
`/api/agencies`, `/api/stops/{id}`, `/api/routes/{id}/shapes`, `/api/routes/{id}/stops`,
`/api/routes/{id}/vehicles`, `/api/tracking`, `/api/positions`, `/api/realtime`,
`/api/docs`, `/api/swagger`, `/api/openapi.json`, `/api/health`.

Also 404: **`/api/journeys`** and **`/api/journeys/{id}`** — there is no global journey
index, which is why the 270 unobserved IDs cannot be resolved (§4.4).

**No GTFS feed and no service-alerts feed found.** `azoresbus.pt/gtfs`, `/gtfs.zip` and
other conventional URLs are 404; `robots.txt` and `sitemap.xml` are 404; the homepage has
zero hits for "gtfs" or "dados abertos"; `/static/json/` directory listing is 403. That
is a **strong negative, not proof** that a private or unlinked feed does not exist — it
is worth asking the operator directly (§10). Disruption notices stay on our own
`RouteInfo` model, curated by hand as today.

---

## 9. Sync cost budget

> **Recomputed.** The 2026-08-13 budget (165 journey-list GETs from three canonical
> dates, ~1117 total) is invalid — three canonical dates cannot capture this calendar
> (§4.2, `98` **B0**/**B6**).

The sample is **tiered** ([02 §4.1](02-backend-plan.md)): the season we are currently in
("near week") is refetched every run; the opposite season ("far week") is fetched
monthly-or-on-change and otherwise reused from stored observations.

**Full run** — near week + far week + holidays ≈ **16 dates**:

| Phase | Requests |
|-------|----------|
| Stops | 1 |
| Routes list | 1 |
| Route detail (shape + stop set) | 55 |
| Journey lists (55 routes × ~16 dates) | **~880** |
| Journey details (unique IDs across the sample; 989 in the term week alone) | **~1 200** |
| **Total** | **~2 150** (~13 min at 0.35 s) |

**Incremental run** — near week + holidays + sentinels ≈ **9 dates**:

| Phase | Requests |
|-------|----------|
| Stops + routes list | 2 |
| Route detail | 55 |
| Journey lists (55 × ~9 dates) | **~495** |
| Journey details (only IDs new or changed vs the stored matrix) | **~600** |
| **Total** | **~1 150** (~7 min at 0.35 s) |

The split matters because the late-August cadence is **daily** ([02 §4.6](02-backend-plan.md)).
Four weeks of daily *full* runs would be ~60 000 requests; incremental daily plus weekly
full is roughly half that, against a host with no published limit.

**Measured throughput:** 165 requests at 0.25 s inter-request sleep completed in **59 s**
(~2.8 req/s), zero errors. The review itself ran ~305 requests in ~3 minutes and a
1,143-request sweep, with **zero 429s**. At a politer 0.35 s a full sync lands around
**13 minutes**. Still comfortably a weekly job — but the budget cap in
[02 §4.3](02-backend-plan.md) must move from 2000 to ~4000 or the run aborts halfway.

No `Retry-After`, `X-RateLimit-*`, or `429` was observed at any rate tried — but absence
of a published limit is not permission, hence the conservative pacing, the identifying
`User-Agent`, and the hard budget cap.

**The detail fetches cannot be skipped by a stored hash.** The listing carries no `shape`
and no `circulations` (§4, §5), so a journey's detail hash is only knowable after
fetching the detail. See [02 §4.4](02-backend-plan.md).

---

## 10. Open questions for the operator

Worth an email to Eleven Systems / AzoresBus rather than guessing. Reordered by how much
they would change the build:

1. **Is there a published school-term calendar** (term start/end dates) behind the
   33 ↔ 38 flip on line 307? We observe the change on **2026-09-14** and the reversion in
   summer 2027, but we have no boundary table. This is the single highest-value answer:
   it would replace repeated sampling with a stored calendar (`98` §7).
2. **Is a GTFS export planned or already available privately?** It would retire most of
   the sync worker. Nothing public exists (§8).
3. Will `/api/locations` populate on 1 September, or does it need enabling per-client?
4. Can they allowlist our Hetzner egress IPs? Cloudflare already blocks datacenter IPs on
   `pdl.elevensystems.pt` (`src/minibus/docs/tailscale-tracking-proxy.md`); `azb` is also
   behind Cloudflare (`server: cloudflare`, `cf-ray …-LIS`) and is untested from our
   infrastructure.
5. Is there a published rate limit or a preferred `User-Agent` / contact header?
6. **What are the ~270 journey IDs we never observe?** (989 seen in one term week; max id
   1259.) Historical, deleted, or a pattern we have not sampled?
7. Do journey IDs survive a timetable republish, or are they reallocated?

> **Answered and closed since the 2026-08-13 draft:** "Routes 112, 321, 324, 325 return
> no journeys — seasonal, or not yet loaded?" They are **school-term** lines, populated
> from 2026-09-14 and empty on 2026-09-02 and 2027-07-07. `328` is weekend-only. All five
> carry `isActive: false`, which is a display flag (§3.1, `98` **B5**).
