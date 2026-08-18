---
title: "Trip detail screen — no map, no sibling departures, dead 'see details' link"
issues: [2, 3]
severity: medium
repo: SaoMiguelBus (API change optional)
files:
  - app/(tabs)/transit/[tripId].tsx
  - features/transit/components/TripDetail.tsx
  - features/transit/components/RouteCard.tsx
  - lib/api.ts
---

# 2 & 3 — the trip detail screen is a card and nothing else

Reached from **Next Departures** on a stop page
([stop/[stopId].tsx:275-305](../../../app/(tabs)/transit/stop/[stopId].tsx#L275-L305)),
from a ride leg header inside a journey card
([JourneyCard.tsx:289-305](../../../features/transit/components/JourneyCard.tsx#L289-L305)),
or from a legacy result card.

## What the screen is today

[`app/(tabs)/transit/[tripId].tsx`](../../../app/(tabs)/transit/[tripId].tsx)
renders an optional info notice and then `<TripDetail trip={trip} />`, which is
a one-line wrapper around `<RouteCard expandedByDefault />`
([TripDetail.tsx:19](../../../features/transit/components/TripDetail.tsx#L19)).
So the "detail page" is the same card the results list shows, pre-expanded.
There is no map and nothing about the rest of the line.

That is a visible regression against the rest of the AzoresBus work: the network
map, the line map and the journey map all exist and all draw real road geometry,
and this is the one transit screen that has geometry available and does not use
it.

---

## Issue 3 — "Clique para ver detalhes" does nothing on this screen

`RouteCard` renders that label twice:

- [RouteCard.tsx:127-140](../../../features/transit/components/RouteCard.tsx#L127-L140)
  — the expand/collapse toggle. Works everywhere.
- [RouteCard.tsx:179-183](../../../features/transit/components/RouteCard.tsx#L179-L183)
  — inside the expanded stops panel, calling `openDetail()`.

`openDetail` is
[RouteCard.tsx:45-50](../../../features/transit/components/RouteCard.tsx#L45-L50):
`router.push('/(tabs)/transit/[tripId]', { tripId })`. On the trip detail screen
that pushes **the screen you are already on** — a new entry on the stack showing
identical content. To the user it looks like a dead link; to anyone hammering it
it is a stack of duplicate screens to back out of.

The same applies to the card header `Pressable` at
[RouteCard.tsx:60](../../../features/transit/components/RouteCard.tsx#L60),
which also calls `openDetail`.

### Fix

Thread the intent through, rather than detecting the current route:

```tsx
// RouteCard.tsx
type Props = {
  trip: TransitSearchResult;
  searchDay: string;
  expandedByDefault?: boolean;
  /** false on the trip detail screen — there is nowhere further to go. */
  linkToDetail?: boolean;   // default true
};
```

When `linkToDetail === false`:

- drop the second `Pressable` + label at lines 179-183 entirely (do not render a
  disabled-looking link);
- make the header `Pressable` at line 60 a plain `View`, or point it at the
  expand toggle so tapping the card body still collapses/expands.

`TripDetail` passes `linkToDetail={false}` alongside its existing
`expandedByDefault`. Nothing else changes — the results list keeps both links.

The expand toggle at lines 127-140 **stays**: on the detail screen it starts
expanded and collapsing the stop list is a legitimate action.

---

## Issue 2a — show the route shape on this screen

### What is available

`GET /api/v3/transit/trips/{id}/geometry` already returns everything needed, and
with `from`/`to` omitted it returns the **whole trip** — see
[api_v3.py:264-313](../../../../SaoMiguelBus-api/src/transit/api_v3.py#L264)
("Omit them for the whole trip") and `leg_geometry` in
[services/geometry.py](../../../../SaoMiguelBus-api/src/transit/services/geometry.py):

```jsonc
{
  "tripId": 1234,
  "route": "110",
  "shape": "<google-encoded polyline>",   // "" on legacy — no shapes exist there
  "stops": [ { "stopId": 42, "name": "...", "time": "09h15",
               "sequence": 7, "dayOffset": 0, "lat": 37.7, "lon": -25.6,
               "code": "PDL0123" } ]
}
```

The client wrapper `fetchTripGeometry({ tripId, from?, to?, dataset })` already
supports the no-range call
([lib/api.ts:505-525](../../../lib/api.ts#L505-L525)) — `from`/`to` are optional
and simply omitted from the query string. **No API change is needed for the map.**

Note that trip *detail* (`GET /trips/{id}`) is not enough on its own: its `stops`
carry only `name`, `time` and `sequence`
([services/v3.py:97-104](../../../../SaoMiguelBus-api/src/transit/services/v3.py#L97-L104))
— no `stopId` and no coordinates. The geometry endpoint is the one with
positions, and it also resolves the **pole** rather than the stop centroid.

### Implementation

Reuse `JourneyMap` rather than writing a second map. Wrap the trip in a
single-leg `TransitJourney` so `buildJourneyMapData` and every Android/iOS
marker path already written applies unchanged:

1. Add `journeyFromTripDetail(detail)` next to the existing
   [`lib/journey-fallback.ts`](../../../lib/journey-fallback.ts)
   `journeyFromSearchResult` — one `ride` leg, `board` = first stop,
   `alight` = last stop, `transfers: 0`.
2. Render `<JourneyMap journey={syntheticJourney} variant="preview" />` between
   the info notice and the card in
   [`[tripId].tsx:159`](../../../app/(tabs)/transit/[tripId].tsx#L159), with
   `onPress` pushing `/(tabs)/transit/map?journeyId=…`.
3. `JourneyMap` already returns `null` for `variant="preview"` when there is no
   geometry ([JourneyMap.tsx:136-140](../../../features/transit/components/JourneyMap.tsx#L136-L140)),
   so the legacy dataset silently gets no map — which is correct, legacy has
   neither shapes nor poles.

One caveat to handle: the full-screen map screen resolves its journey out of the
`['transit','search']` query cache
([map.tsx:40-56](../../../app/(tabs)/transit/map.tsx#L40-L56)). A synthetic
journey built on the trip detail screen is not in that cache, so either seed it
with `queryClient.setQueryData` before navigating, or accept a non-interactive
preview here and leave the full map to journeys.

**Fix [05](05-android-map-labels-and-framing.md) first**, or this screen ships
with the same crowded-labels and bad-framing problems on Android.

---

## Issue 2b — "Other departures" list below the card

### What the rider is asking

"I missed this one / this one is too early — when is the next bus doing the same
run?" That is *other trips on the same line, passing this trip's boarding stop,
on the same service day.*

### What the API can answer today

| Endpoint | Gives us | Verdict |
|----------|----------|---------|
| `GET /lines/{code}` | trip ids, `typeOfDay`, `headsign`, votes — **no times, no stops, no direction**, capped at 50, ordered by `id` ([services/v3.py:121-157](../../../../SaoMiguelBus-api/src/transit/services/v3.py#L121-L157)) | unusable as-is |
| `GET /stops/{stopId}` | `departures[]` with `tripId`, `route`, `time`, `sequence`, `destination`, `code` ([services/stops.py:55-125](../../../../SaoMiguelBus-api/src/transit/services/stops.py#L55-L125)) | **usable**, filtered client-side by `route` |
| `GET /journeys?origin=&destination=` | full itineraries for the same O→D | heavier, and it re-plans rather than lists |

### Recommended: reuse the stop-detail endpoint, no API change

On the trip detail screen we know the trip's first stop from the geometry
response (`stops[0].stopId`, which trip detail alone does not carry — another
reason to fetch geometry per 2a).

```
GET /api/v3/transit/stops/{boardStopId}?day={day}&start=00h00&dataset={dataset}
→ departures.filter(d => d.route === trip.route && d.tripId !== trip.id)
```

Render it with the same row component the stop page uses
([stop/[stopId].tsx:275-305](../../../app/(tabs)/transit/stop/[stopId].tsx#L275-L305))
— route badge, destination, time, tap to open that trip's detail page — so the
two lists behave identically, which is what the report asks for. Extract that
row into `features/transit/components/DepartureRow.tsx` rather than copying it.

Two behaviours to get right:

- **`start=00h00`, not "now".** This list is "the rest of the line's day",
  not "next departures". The stop page deliberately passes a bucketed current
  time ([stop/[stopId].tsx:74-81](../../../app/(tabs)/transit/stop/[stopId].tsx#L74-L81));
  here that would hide the earlier options a rider is comparing against.
- **`DEFAULT_DEPARTURE_LIMIT`** applies server-side. Check the value in
  [`services/stops.py`](../../../../SaoMiguelBus-api/src/transit/services/stops.py);
  if a busy interchange truncates the list before the same-line trips are
  reached, that is the trigger for the API option below.

### API option, if the client-side filter proves too lossy

Add `?line=<code>` to `GET /stops/{stopId}` — a single `filter(trip__line__code=…)`
in `serialize_stop_detail`, applied before `limit`, so the cap counts only the
rows the caller wants. Cheaper and more honest than filtering after truncation.

Alternative shape, if a *line-wide* timetable is wanted later:
`GET /lines/{code}/departures?stop={stopId}&day=` — but that is a new view, and
it is not needed for the reported issue.

## Verification

- Open a trip from **Next Departures** on the AzoresBus dataset: the shape draws,
  the "Other departures" list shows the same line's other runs, and tapping one
  navigates to that trip.
- Same screen on the legacy dataset: no map (silently), and the departures list
  still works — legacy has no shapes but does have stop times.
- Tap every "see details" affordance on the detail screen: none of them pushes a
  duplicate screen.
