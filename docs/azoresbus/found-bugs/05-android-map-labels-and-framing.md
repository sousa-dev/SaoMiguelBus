---
title: "Android maps — every stop name painted on the map, and the path does not fit"
issues: [7, 8]
severity: high (Android only)
repo: SaoMiguelBus
files:
  - lib/leaflet-map-html.ts
  - components/AndroidOsmWebMap.tsx
  - components/OsmMapView.tsx
  - features/transit/lib/journey-pin-overlay.ts
---

# 7 & 8 — the Android (Leaflet) map is crowded and badly framed

iOS uses Apple Maps via `react-native-maps`; Android renders Leaflet + OSM tiles
in a WebView (`AndroidOsmWebMap` → `lib/leaflet-map-html.ts`). Both bugs are in
the Android half only, which is why they were reported as Android-specific.

---

## Issue 7 — every stop's name is printed permanently on the map

### Root cause

`markerIcon` in the Leaflet document paints a **permanent caption** under any
marker that has a `title` and no `label`:

```js
// lib/leaflet-map-html.ts:107-109
const caption = marker.title && marker.iconKind !== 'bus' && !inner
  ? '<div class="hub-marker-label">' + marker.title + '</div>'
  : '';
```

`inner` is `marker.label`. Now look at what a journey pin sends
([journey-pin-overlay.ts:16-31](../../../features/transit/lib/journey-pin-overlay.ts#L16-L31)):

```ts
const isAction = pin.kind !== 'stop';
return {
  ...(isAction ? { label: String(pin.step) } : {}),   // numbers ONLY on board/change/alight
  size: (isAction ? 26 : 12) + (highlighted ? 6 : 0),
  title: pin.code ? `${pin.name} · ${pin.code}` : pin.name,   // <- always set
};
```

So the condition `title && !label` selects **exactly the intermediate stops** —
the ones the design explicitly wanted as bare dots. The comment one line above
says so:

> Only the places a rider acts get a number; intermediate stops stay dots, or a
> long route turns into an unreadable string of beads.

A real São Miguel line runs 70–127 stops per direction (per
[98-review-findings.md](../98-review-findings.md)), so a journey map paints up to
~120 name captions on top of each other. iOS is unaffected because
`JourneyMapMarker` puts the name in `title`/`description`, which Apple Maps shows
in a **callout on tap** ([JourneyMapMarker.tsx:31-38](../../../features/transit/components/JourneyMapMarker.tsx#L31-L38)).

### Fix

The two platforms should agree: a name appears when the marker is *selected*,
not always. Two changes, both small.

**1. Add an explicit caption flag to the overlay contract** rather than
inferring it from `title && !label`. In
[`lib/map-overlays.ts`](../../../lib/map-overlays.ts):

```ts
export type MapMarkerOverlay = {
  ...
  title?: string;
  /** Paint `title` under the pin. Off by default — a title is a tap target's
   *  name, not a map label. */
  showLabel?: boolean;
};
```

and in `markerIcon`:

```js
const caption = marker.showLabel && marker.title && marker.iconKind !== 'bus'
  ? '<div class="hub-marker-label">' + marker.title + '</div>'
  : '';
```

**2. Journey pins opt in only when highlighted.** In `journeyPinOverlay`, which
already receives `highlighted`:

```ts
title: pin.code ? `${pin.name} · ${pin.code}` : pin.name,
showLabel: highlighted,
```

Now a tap on a dot → `onStopPress` → the map screen sets `highlightedStopId` and
calls `focusStop`, which zooms and centres it
([map.tsx:96-103](../../../app/(tabs)/transit/map.tsx#L96-L103)) — and with
`showLabel` following `highlighted`, the name appears at the same moment. That is
precisely the behaviour the report asks for, and the plumbing already exists.

**3. Audit the other callers before flipping the default.** `showLabel`
defaulting to `false` changes every Android map that relies on the old implicit
behaviour. The callers passing `title` are:

| Caller | Today | After |
|--------|-------|-------|
| [transit/stop/[stopId].tsx:122-135](../../../app/(tabs)/transit/stop/[stopId].tsx#L122-L135) | pole code captions on 1–4 poles | **keep** — `showLabel: true`, it is a handful of pins and the code is the answer the screen exists for |
| [transit/line/[code].tsx:76-94](../../../app/(tabs)/transit/line/[code].tsx#L76-L94) | name + code on 70–127 stops | **drop** — same crowding bug, same fix (`showLabel: stop.stopId === focused`) |
| `transit/network.tsx`, `traffic/`, `earthquakes/`, `minibus/` maps | varies | check each; default off is the safe direction, then re-enable where the caption is the content |

The line map (`line/[code].tsx`) is worth fixing in the same PR: it has the
identical defect and the identical `focused` state to drive the fix.

---

## Issue 8 — the preview map does not frame the whole path

### Root cause

Two independent problems, both in the Android path.

**(a) `deltaToZoom` ignores the container.**

```js
// lib/leaflet-map-html.ts:76-79
function deltaToZoom(latitudeDelta) {
  const zoom = Math.log2(360 / Math.max(latitudeDelta, 0.0005));
  return Math.max(0, Math.min(19, Math.round(zoom)));
}
```

This inverts the Web-Mercator relation `visibleSpan = 360 · pixels / (256 · 2^z)`
with `pixels` pinned at 256 and the **latitude** delta substituted for a
longitude span. Three errors compound:

- the map is not 256 px wide (a card preview is ~343 × 200 dp);
- latitude and longitude do not share a scale in Mercator — at São Miguel's
  ~37.7° N the factor is `cos(37.7°) ≈ 0.79`;
- `longitudeDelta` is discarded entirely, so an east–west route is framed by its
  much smaller north–south extent;
- `Math.round` can add half a zoom level, i.e. up to **1.41× extra
  magnification**.

Worked through for the 200 dp-tall preview: the visible latitude span comes out
at roughly **0.62 × the requested `latitudeDelta`**, and the visible longitude
span at ~1.34 × it — while a typical São Miguel journey is far wider than it is
tall. The path overflows on both axes. `fitRegionForCoordinates`
([lib/island-map.ts:214-235](../../../lib/island-map.ts#L214-L235)) computes the
right bounding box; `deltaToZoom` then throws half of it away.

**(b) The Android region is captured once and never updated.**

```ts
// components/OsmMapView.tsx:74-79
const androidInitialRegionRef = useRef<Region | null>(null);
if (!androidInitialRegionRef.current) {
  androidInitialRegionRef.current = initialRegion ?? ... ?? getIslandMapRegion();
}
```

and `AndroidOsmWebMap` builds its HTML once
([AndroidOsmWebMap.tsx:119-133](../../../components/AndroidOsmWebMap.tsx#L119-L133))
and thereafter sends only `updateOverlays` / `updateOptions` — **never a region**.
So when a `region` prop changes (geometry arrives late, a leg's query resolves
after the first, the user switches direction on the line map) Android keeps the
first framing while iOS re-frames. `JourneyMap`'s `isLoading` gate
([JourneyMap.tsx:122-134](../../../features/transit/components/JourneyMap.tsx#L122-L134))
hides this for the common case, but it is not a guarantee — and it is exactly why
the fix below must not rely on the initial region being right.

### Fix

**1. Frame by bounds, not by a derived zoom.** Leaflet's `fitBounds` already
accounts for the container size and the Mercator scale, and the bridge already
exposes it ([leaflet-map-html.ts:331-345](../../../lib/leaflet-map-html.ts#L331)).
Convert a region to its corners in `setViewFromRegion` and let Leaflet do the
arithmetic:

```js
function setViewFromRegion(nextRegion, animate) {
  if (!map || !nextRegion) return;
  const bounds = L.latLngBounds(
    [nextRegion.latitude - nextRegion.latitudeDelta / 2,
     nextRegion.longitude - nextRegion.longitudeDelta / 2],
    [nextRegion.latitude + nextRegion.latitudeDelta / 2,
     nextRegion.longitude + nextRegion.longitudeDelta / 2],
  );
  withSuppressedRegionEvents(function () {
    map.fitBounds(bounds, { animate: !!animate, padding: [8, 8] });
  });
  hasInitialView = true;
}
```

Keep `deltaToZoom` for `flyTo` (line 323), where the caller wants a *zoom level*
around a point rather than a fit — but fix the same aspect error there by
deriving from the larger of the two deltas and dropping the `Math.round`
(`Math.floor` under-zooms, which errs towards showing too much rather than too
little).

`map.invalidateSize()` is already called 60 ms after creation
([line ~295](../../../lib/leaflet-map-html.ts#L295)); `fitBounds` must run
**after** the container has its real size, so either move the fit into that same
timeout or re-fit inside it.

**2. Let the region change after mount.** Add a `region` channel to the bridge,
mirroring `updateOverlays`:

- `AndroidOsmWebMap`: a `useEffect` keyed on a serialised `initialRegion` that
  injects `window.__mapBridge.applyRegion(region)` once `readyRef.current` is
  set;
- `OsmMapView`: stop freezing `androidInitialRegionRef` — keep it for the *first*
  HTML build (that part is deliberate, it prevents WebView reloads and the old
  flashing) but pass the live `initialRegion` down as a separate prop for the
  update path.

Guard against fighting the user: only apply a region update when it differs
materially from the current view. `setViewFromRegion` already has that check
([lines 245-255](../../../lib/leaflet-map-html.ts#L245-L255)); reuse it, and skip
updates entirely once `onRegionChangeComplete` has reported a gesture-driven
change on a `scrollEnabled` map.

**3. Preview maps get padding, full maps get more.** The preview in
`JourneyCard` is 200 dp tall
([JourneyMap.tsx:30](../../../features/transit/components/JourneyMap.tsx#L30))
and non-interactive — if the path does not fit there, the rider has no way to
pan. `fitRegionForCoordinates(journeyMapCoordinates(data), 0.01)`
([JourneyMap.tsx:74-77](../../../features/transit/components/JourneyMap.tsx#L74-L77))
already pads by 0.01°; once (1) is in, verify against a long route
(e.g. Ponta Delgada → Nordeste) and raise the preview padding if the endpoints
sit on the frame edge.

## Verification

Android only, on a device or emulator (Leaflet does not run in Expo Go's web
target the same way):

- Expand a journey card for a 40+ stop route: intermediate stops are dots, no
  text; both endpoints and any change are numbered circles.
- Tap a dot on the full map screen: it zooms, centres, and *then* shows the name.
- The preview map shows the entire polyline including both endpoints, with
  margin, for a short urban ride and for a cross-island route.
- Open the line map and swap direction: the map re-frames to the new direction
  (this is the case that (2) fixes and (1) alone does not).
- Stop page: pole codes are still captioned — that map is the one place the
  labels are the content.
