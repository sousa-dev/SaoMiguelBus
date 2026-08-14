---
title: "Upstream API reference — azb.elevensystems.pt + azoresbus.pt"
status: verified
date: 2026-08-13
verified_against: live upstream, 2026-08-13
---

# Upstream API reference (reverse-engineered)

Everything below was **probed live on 2026-08-13**. No auth, no API key, plain
`GET`, JSON responses, ASP.NET Core backend (RFC 9110 problem+json on errors).

> The vendor is **Eleven Systems** — the same vendor already powering PDL Mini Bus
> live tracking (`pdl.elevensystems.pt/publicapi`). Payload shapes are shared between
> the two deployments, which is why we can build AzoresBus tracking before it goes live.

---

## 1. Hosts and base paths

| Host | Base | Purpose |
|------|------|---------|
| `azb.elevensystems.pt` | `/api` | Schedules, stops, routes, **live vehicle locations** |
| `azoresbus.pt` | `/static/json` | Tariffs |
| `pdl.elevensystems.pt` | `/publicapi` | Existing PDL Mini Bus AVL (reference shape only) |

Note the path difference: PDL uses `/publicapi/locations`, AzoresBus uses **`/api/locations`**.
This matters for the proxy config (see [02-backend-plan.md](02-backend-plan.md) §5).

---

## 2. `GET /api/stops`

Returns **1456** stops.

```json
[ { "id": "167", "name": "ACHADA (PRAÇA)", "nameShort": "6014",
    "position": { "lat": 37.851258, "lon": -25.266083 } } ]
```

**Measured:** 1456 stops → **816 distinct `name` values**; **635 names carry more than
one stop code** (630 pairs, 5 triples, 181 singletons).

The duplicates are the two sides of a road, and they are tightly clustered:

| Measure | Value |
|---------|-------|
| Median separation within a duplicate name | **12 m** |
| Mean / max | 17 m / **164 m** |
| Groups > 100 m apart | 3 |
| Groups > 250 m apart | **0** |
| Pairs with consecutive integer codes | **629 of 630** |

Worst three: `COVOADA (AV. 6 DE JANEIRO)` 164 m, `PONTA DELGADA (ALFÂNDEGA)` 134 m,
`P. DELGADA (FORTE S. BRÁS)` 108 m.

### 2.1 The pair is selected by direction of travel

Comparing both directions of the same route, the two codes are **not interchangeable** —
each direction serves its own pole:

| Route | Names served both ways | Different code per direction |
|-------|------------------------|------------------------------|
| 101 | 27 | **24** |
| 102 | 14 | **10** |

e.g. `PONTA DELGADA (ALFÂNDEGA)` is code `1002` in direction 0 and `1001` in direction 1.

Which of the pair is the lower number is **not** consistent (`1045`/`1044` → dir 0 takes
the higher; `1356`/`1357` → dir 0 takes the lower), so side cannot be inferred from the
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

### `GET /api/routes/{id}`

Superset of the list entry, plus:

- `shape` — **encoded polyline** for the whole route (Google polyline algorithm, ~844 chars for route 1)
- `stops[]` — union of all stops served across both directions, each `{ sequence: 0, stage: {...}, departureTime: 0, arrivalTime: 0 }`

`sequence`/times are **zeroed** here — this endpoint gives you the stop *set* and the
shape, not an ordering. Use journeys for ordering.

We already decode polylines client-side (`lib/polyline.ts`) and store route shapes
server-side (`MinibusLine.route_shapes`), so this drops straight in.

---

## 4. `GET /api/routes/{routeId}/journeys`

```json
[ { "id": "1", "name": "17:15  »  17:55", "start": "17:15:00", "end": "17:55:00",
    "startTime": 62100, "endTime": 64500,
    "direction": 0, "isActive": false, "type": "scheduled" } ]
```

- `startTime`/`endTime` — **seconds since midnight** (62100 = 17:15).
- `direction` — `0` or `1`.
- `type` — `"scheduled"` for all AzoresBus journeys. (PDL Mini Bus also emits `"frequency"`.)
- `isActive` — real-time "running right now" flag; always `false` in the schedule listing.

### 4.1 The `?day=` parameter — the key finding

`day` is the **only** query parameter the endpoint binds. Everything else
(`direction`, `type`, `active`, `weekday`, `serviceDay`…) is silently ignored — verified
by sending `?direction=abc`, which returns `200` with the full unfiltered list, whereas
`?day=abc` returns `400`:

```json
{ "status": 400, "errors": { "day": ["The value 'abc' is not valid."] } }
```

It accepts an **ISO date**, not a weekday name:

| Value | Result |
|-------|--------|
| `2026-09-01` | `200` — journeys valid that date |
| `Monday`, `monday`, `1`, `0`, `Sunday` | `400` |
| `1970-01-01T00:00:00` | `200`, empty list |

### 4.2 Service calendar — exactly three patterns

Journey IDs are **globally unique** (not per-route) and **each journey belongs to exactly
one day-type**. Route 25:

| Date | Weekday | n | Journey IDs |
|------|---------|---|-------------|
| 2026-09-02 | Wednesday | 17 | 488–504 |
| 2026-09-05 | Saturday | 10 | 505–514 |
| 2026-09-06 | Sunday | 8 | 515–522 |

Probing Mon/Tue/Wed/Thu/Fri returned the identical weekday set, and every public
holiday tested — 2026-10-05, 2026-12-08, 2026-12-25, 2026-08-15, 2027-01-01 —
returned the **Sunday** set with **zero new journey IDs**.

> **Upstream resolves holidays to Sunday service itself.** There is no school-day,
> summer, or exception calendar. Three patterns, full stop.

This maps 1:1 onto our existing `transit.Calendar` (`WEEKDAY` / `SATURDAY` / `SUNDAY`),
which already applies the same holiday→Sunday rule in
`transit/services/search.py:get_type_of_day`. No schema change needed for calendars.

### 4.3 The September change is real and already served

The same endpoint returns **different data either side of the cutover**:

| Route | Sat 2026-08-15 | Sat 2026-09-05 |
|-------|----------------|----------------|
| 25 | 8 journeys, first 08:00 | **10 journeys, first 06:30** |

So we do **not** need a separate "new timetables" feed — one sync, parameterised by
date, yields both the legacy-period and new-period schedules. Dates before the
concession start return the outgoing operator's service.

### 4.4 Network size (measured)

Sweeping all 55 routes × {Wed, Sat, Sun}:

- **895 unique journeys**, highest journey ID `1259`
- 897 journey-rows summed across the three dates → **~2 journeys of overlap total**,
  confirming day-types partition cleanly
- 12 routes run no service at all on Sundays; 4 routes (`112`, `321`, `324`, `325`)
  returned zero journeys on all three dates and may be seasonal or not yet loaded

---

### 4.5 Network topology — loops and revisited stops

Scanning all 50 routes that have weekday service (5 routes — `112`, `321`, `324`, `325`,
`328` — return nothing on a weekday):

- **10 routes are single-direction:** `221`, `222`, `301`, `303`, `305`, `306`, `323`,
  `335`, `N01`, `N03`
- **5 routes are loops** whose first and last stop share a name: `301` (59 stops),
  `303` (59), `306` (43), `323` (17), `N03` (47)
- **13 routes revisit the same stop name within a single journey:**

| Route | Repeated names | Journey length |
|-------|----------------|----------------|
| 335 | **37** | 97 |
| 301, 303 | 14 | 59 |
| N01 | 14 | 68 |
| 306 | 9 | 43 |
| N05, N03 | 3 | 54, 47 |
| 105, 323 | 2 | 102, 17 |
| 108, 110, 202, 312 | 1 | 75, 69, 27, 52 |

This matters far more than it looks: any origin/destination matcher that resolves a stop
by **first occurrence** will reject valid trips on these routes. Both our current
implementations do exactly that. See [02 §3.3](02-backend-plan.md).

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

---

## 6. `GET /api/locations` — live tracking, already wired up

```
GET https://azb.elevensystems.pt/api/locations   →  200  []
GET https://azb.elevensystems.pt/api/locations/1 →  404  (problem+json)
```

**The endpoint exists and answers.** It returns an empty fleet because AzoresBus
vehicles are not reporting yet. `/publicapi/locations` on this host is `404` — the path
differs from PDL.

The payload shape is known from the live PDL deployment, which returns data right now:

```json
[ { "id": "11010934", "position": { "lat": 37.744548, "lon": -25.660753 },
    "status": "ontime", "color": "EC6E00" } ]
```

Vehicle detail (`/locations/{id}`), from PDL:

```json
{ "id": "11010934", "fleetId": "25", "licensePlate": "",
  "position": { "lat": 37.743718, "lon": -25.665714 },
  "speed": 2.8115294, "status": "incomingAt", "currentStopSequence": 20,
  "route": { "id": "4", "name": "LINHA D - LARANJA", "nameShort": "D",
             "description": "…", "color": "EC6E00", "isActive": false },
  "journey": { "id": "5", "type": "frequency", "shape": "myieFvut{C…",
               "circulations": [ … 23 entries … ] } }
```

`route` and `journey` are the *same shapes* as §3/§5, so a single set of serializers
covers schedule and tracking.

Observed `status` values so far: `ontime`, `incomingAt`. Treat as an open enum.

---

## 7. `GET https://azoresbus.pt/static/json/tariffs.json`

32 066 bytes. **Serves `Last-Modified` and `ETag`** — use them for the "last updated"
requirement rather than inventing a timestamp:

```
last-modified: Wed, 05 Aug 2026 13:47:25 GMT
etag: "80d474f2e024dd1:0"
```

```json
{ "date": "2026-09-01",
  "comment": "A aquisição do cartão do passe terá um custo de 6€.\n…",
  "categories": [ … ],
  "infos": [ … ] }
```

`date` is the **"data em vigor"** (effective date) — and it is already `2026-09-01`,
confirming this file describes the new concession's fares.

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

`fareUnits` is a **human-readable band label**, not a number (`"0 a 5"`, `"6 a 7"`, `"8"`).
Do not parse it into a numeric range — store it verbatim and render it. This is the main
reason the storage model has to stay schemaless (see [02-backend-plan.md](02-backend-plan.md) §6).

There is also a top-level `infos[]` array of link-outs, which the pricing page should render:

```json
"infos": [ { "text": "Para mais informação sobre a aquisição de títulos…",
             "url": "https://azoresbus.pt/downloads/docs/Info_passes.pdf" } ]
```

---

## 8. Endpoints that do **not** exist

Probed and confirmed `404`: `/api`, `/api/vehicles`, `/api/fleet`, `/api/lines`,
`/api/calendars`, `/api/services`, `/api/gtfs`, `/api/alerts`, `/api/agencies`,
`/api/stops/{id}`, `/api/routes/{id}/shapes`, `/api/routes/{id}/stops`,
`/api/routes/{id}/vehicles`, `/api/tracking`, `/api/positions`, `/api/realtime`,
`/api/docs`, `/api/swagger`, `/api/openapi.json`, `/api/health`.

**No GTFS feed and no service-alerts feed.** Disruption notices stay on our own
`RouteInfo` model, curated by hand as today.

---

## 9. Sync cost budget (measured)

| Phase | Requests |
|-------|----------|
| Stops | 1 |
| Routes list | 1 |
| Route detail (shape + stop set) | 55 |
| Journey lists (55 routes × 3 canonical dates) | 165 |
| Journey details | ~895 |
| **Total** | **~1117** |

**Measured throughput:** 165 requests with a 0.25 s inter-request sleep completed in
**59 s** (~2.8 req/s) with zero errors or throttling. A full sync at a more polite
0.35 s lands around **7 minutes**. Comfortably a weekly job.

No `Retry-After`, `X-RateLimit-*`, or `429` was observed at this rate — but absence of a
published limit is not permission, hence the conservative pacing in
[02-backend-plan.md](02-backend-plan.md) §4.

---

## 10. Open questions for the operator

Worth an email to Eleven Systems / AzoresBus rather than guessing:

1. Will `/api/locations` populate on 1 September, or does it need enabling per-client?
2. Can they allowlist our Hetzner egress IPs? (Cloudflare already blocks datacenter IPs
   on `pdl.elevensystems.pt` — see `src/minibus/docs/tailscale-tracking-proxy.md`.)
3. Is there a published rate limit or a preferred `User-Agent` / contact header?
4. Routes `112`, `321`, `324`, `325` return no journeys — seasonal, or not yet loaded?
5. Is a GTFS export planned? It would retire most of the sync worker.
