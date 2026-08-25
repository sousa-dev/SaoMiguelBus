---
title: "AzoresBus — bugs found in QA"
status: draft
date: 2026-08-18
scope: SaoMiguelBus (mobile), SaoMiguelBus-api where noted
parent: docs/azoresbus/README.md
---

# AzoresBus changeover — bugs found while testing

Nine issues reported from hands-on testing of the AzoresBus dataset, analysed
against the code and written up one document per fix. Related issues are merged
where they share a root cause or a file.

Every claim here was checked against source; each document names the exact file
and line the behaviour comes from. Where a fix needs the API, the API-side
change is called out separately so the two repos can move independently.

| Doc | Reported issues | Severity | Repo |
|-----|-----------------|----------|------|
| [01-missing-i18n-keys.md](01-missing-i18n-keys.md) | 1 | **High** — raw key strings on screen | mobile |
| [02-trip-detail-map-and-other-departures.md](02-trip-detail-map-and-other-departures.md) | 2, 3 | Medium — missing feature + dead link | mobile (+ API, optional) |
| [03-share-trip-link-and-full-journey.md](03-share-trip-link-and-full-journey.md) | 4 | Medium — growth/product | mobile |
| [04-result-card-tap-and-time-filter.md](04-result-card-tap-and-time-filter.md) | 5, 6 | **High** — search time is ignored | mobile |
| [05-android-map-labels-and-framing.md](05-android-map-labels-and-framing.md) | 7, 8 | **High** on Android — maps unreadable | mobile |
| [06-premium-pinned-journeys.md](06-premium-pinned-journeys.md) | 9 | **High** — premium value on the new dataset | mobile (+ API, optional) |

## The one-paragraph version

Three of the nine are single-line regressions (missing translation keys, a
Leaflet caption, a dead `router.push` to the screen you are already on). Two are
the same underlying shortcut taken during the journeys migration: the client
asks the API for the **whole service day** and only re-sorts locally
(`useOfflineSearch.ts:15`), and it adapts a journey to the old single-trip shape
whenever it needs to track, pin or share (`journey-legs.ts`). The remaining four
are features that were scoped out of the first journeys pass and now read as
regressions to a rider who had them on the legacy network — most importantly
**premium pinning is invisible during preview** (`TrackButton.tsx:57` via
`canTrack`), which is issue 9 and has its own full document.

## Fix order

1. **[01](01-missing-i18n-keys.md)** — three keys, no design work, ships today.
2. **[04](04-result-card-tap-and-time-filter.md)** — the time field silently
   does nothing; riders read that as a broken search.
3. **[05](05-android-map-labels-and-framing.md)** — every Android journey map is
   affected.
4. **[06](06-premium-pinned-journeys.md)** — the only one with a schema change;
   start the design while 1/4/5 land.
5. **[02](02-trip-detail-map-and-other-departures.md)**, **[03](03-share-trip-link-and-full-journey.md)** — additive.
