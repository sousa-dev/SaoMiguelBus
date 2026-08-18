---
title: "Search results — tapping a card does nothing, and the time field is ignored"
issues: [5, 6]
severity: high
repo: SaoMiguelBus
files:
  - features/transit/components/JourneyCard.tsx
  - features/transit/hooks/useOfflineSearch.ts
  - lib/transit-results.ts
  - app/(tabs)/transit/index.tsx
---

# 5 & 6 — the AzoresBus results list ignores two rider inputs

Both are consequences of the journeys migration: the results list is now
`JourneyCard` ([RouteResults.tsx:51](../../../features/transit/components/RouteResults.tsx#L51))
rather than the legacy `RouteCard`, and the search request was simplified to
always fetch the whole day.

---

## Issue 5 — tapping a result card does nothing

### Root cause

`JourneyCard` has **no pressable card body**. Reading
[JourneyCard.tsx:70-155](../../../features/transit/components/JourneyCard.tsx#L70-L155):
the header (`View`, line 78), the schedule chip, the confirmation banner
(pressable, but only to open the charter alert) and `RouteTimeline` (line 135)
are all plain views. The only expand affordance is the small row at
[lines 142-155](../../../features/transit/components/JourneyCard.tsx#L142-L155) —
the `transitShowSteps` / `transitHideSteps` label plus chevron.

The legacy `RouteCard` did wrap its header in a `Pressable`
([RouteCard.tsx:60](../../../features/transit/components/RouteCard.tsx#L60)), so
this reads as a regression to anyone who used the old list. (That `Pressable`
navigated to trip detail rather than expanding — see
[02](02-trip-detail-map-and-other-departures.md) issue 3 — but it did *something*.)

### Fix

Wrap everything above the toggle in a `Pressable` that calls the same
`setExpanded((value) => !value)`:

```tsx
<Pressable
  onPress={() => setExpanded((value) => !value)}
  accessibilityRole="button"
  accessibilityState={{ expanded }}
  accessibilityLabel={expanded ? t('transitHideSteps') : t('transitShowSteps')}
>
  {/* header, SchedulePreviewChip, charter banner, RouteTimeline */}
</Pressable>
```

Two things to preserve:

- The charter banner at
  [lines 115-133](../../../features/transit/components/JourneyCard.tsx#L115-L133)
  is itself a `Pressable` opening an alert. Nested pressables on React Native
  give the **inner** one the touch, which is the behaviour we want — but verify
  on Android, where nested touchables are historically less reliable than on iOS.
- Keep the explicit toggle row. It is the only affordance that *tells* the rider
  the card expands; making the whole card tappable is an addition, not a
  replacement.

The same treatment applies to the legs inside the expanded panel if desired, but
`RideLegPanel` already has its own stops toggle
([line 308](../../../features/transit/components/JourneyCard.tsx#L308)) and its
header links to trip detail — leave it alone.

---

## Issue 6 — searching with a specific time changes nothing

### Root cause

The client **never sends the rider's time**. `useTransitSearchWithOffline`
hardcodes it:

```ts
// features/transit/hooks/useOfflineSearch.ts:15
const FULL_DAY_START = '00h00';
...
// :69-76
const result = await searchTransitJourneys({
  origin, destination, day,
  start: FULL_DAY_START,      // <- always midnight
  dataset, maxTransfers,
});
```

The rider's time arrives as `params.userTime`
([index.tsx:181](../../../app/(tabs)/transit/index.tsx#L181), `time.replace(':', 'h')`)
and is used for exactly one thing: a client-side **re-sort**.

```ts
// lib/transit-results.ts — reorderJourneysByUserTime
// departures at or after the threshold go first, earlier ones are APPENDED
return [...upcoming, ...earlier];
```

So the response is the full service day, every time, and the local pass moves
earlier departures to the bottom instead of removing them. The set of cards is
identical for 06:00 and for 18:00 — which is what "it just shows the same
results" describes. `userTime` is also absent from the query key
([useOfflineSearch.ts:54-66](../../../features/transit/hooks/useOfflineSearch.ts#L54-L66)),
correctly, since the request does not depend on it.

### The API already does this correctly

`GET /api/v3/transit/journeys` accepts `start` and filters on it —
[api_v3.py:349](../../../../SaoMiguelBus-api/src/transit/api_v3.py#L349) →
`search_journeys_v3(start_time=…)` →
[services/journeys.py:444-445](../../../../SaoMiguelBus-api/src/transit/services/journeys.py#L444):

```python
start_hour, start_minute = parse_time_parts(start_time.replace('h', ':'))
earliest_departure = start_hour * 60 + start_minute
```

and it passes `earliest` into `_direct_journeys` and the transfer scan. The
legacy `/search` path was called **with** the user's time
(`useTransitQueries.ts:39-56`), which is why the old dataset appeared to work.

### Fix

Send the time, and stop pretending the local re-sort is a filter.

```ts
// useOfflineSearch.ts
export function useTransitSearchWithOffline(params: {
  ...
  userTime: string;          // already here
}) {
  const start = params.userTime || FULL_DAY_START;
  // ...
  queryKey: ['transit', 'search',
    { origin, destination, day, isoDate, start },   // <- add start
    isOnline ? 'online' : 'offline', dataset ?? 'server', maxTransfers],
  // ...
  const result = await searchTransitJourneys({ ..., start });
```

Three consequences to handle deliberately:

1. **Cache churn.** `start` in the key means a minute-granular time picker
   produces a new query per minute. The picker is minute-granular
   (`TransitPlannerCard` → `ThemedDateTimePicker` in `time` mode), but the rider
   changes it by hand, so the churn is bounded by taps, not by the clock. Do
   **not** bucket it the way `departuresStartTime` buckets "now"
   ([transit-format.ts:114-137](../../../lib/transit-format.ts#L114-L137)) —
   that helper exists because *the clock* drives that key. Here the user does.

2. **`reorderJourneysByUserTime` becomes near-redundant** for the online path
   (everything returned is already `>= start`), but keep it: the **offline** v1
   path (`offlineSearch`) has no time filter at all
   ([useOfflineSearch.ts:120-135](../../../features/transit/hooks/useOfflineSearch.ts#L120-L135)),
   and the v2 path filters by ISO date, not time. It is the only thing making
   offline results time-relevant.

3. **Offline should filter too.** Pass `start` into `offlineJourneySearchV2` and
   filter on the board time there, so the online and offline answers to the same
   question agree. Without it, going offline silently widens the result set.

### The default is fine, the empty state is not

`DEFAULT_SEARCH_TIME = '00:00'` ([index.tsx:46](../../../app/(tabs)/transit/index.tsx#L46))
stays — an untouched form means "show me the whole day", which matches the
legacy webapp.

But once `start` really filters, a late-evening search can legitimately return
zero journeys with plenty of service earlier in the day. Today that falls into
the generic `noRoutesMessage` empty state
([index.tsx:406-412](../../../app/(tabs)/transit/index.tsx#L406-L412)), which
says there is no connection between the two stops — which would be a lie.

Add a distinct branch, in the spirit of the caption the stop page already
carries ("departures from HH:MM", see [01](01-missing-i18n-keys.md)):

```jsonc
"noRoutesAfterTimeMessage": "Sem partidas depois das {{time}}",
"noRoutesAfterTimeAction": "Ver o dia todo"
```

with the action resetting `time` to `DEFAULT_SEARCH_TIME`. Distinguishing the
two cases needs one bit the API does not send today — either re-query with
`start=00h00` on empty (one extra request, only on an otherwise-dead screen,
the same trade `transfersAvailable` already makes in
[services/v3.py:360-375](../../../../SaoMiguelBus-api/src/transit/services/v3.py#L360)),
or have the journeys endpoint return `journeysEarlierToday` the way it returns
`transfersAvailable`. Prefer the second if the API is being touched anyway.

## Verification

- Search a busy pair (Ponta Delgada → Ribeira Grande) at 06:00 and at 18:00: the
  card counts differ and no card starts before the chosen time.
- Search after the last departure: the empty state says "no departures after
  HH:MM" and offers the whole day, not "no route between these stops".
- Go offline (premium, bundle downloaded) and repeat: the same filtering applies.
- Tap anywhere on a result card: it expands; tap again: it collapses; tap the
  confirmation banner inside it: the charter alert opens and the card does not
  toggle.
