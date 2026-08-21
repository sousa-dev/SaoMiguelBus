---
title: "The scheduling engine"
parent: ./00-overview.md
---

# 04 — Scheduling engine

The core. Turns a tracked itinerary plus a set of preferences into a list of instants, then
hands those instants to the OS. Satisfies **R9, R10, R13, R14, R20**.

---

## 1. Module layout

Split so that everything interesting is pure and everything impure is trivial — the split that
makes [09](./09-testing.md) possible under a runner that cannot mount React Native.

```
lib/notifications/
  plan.ts          — PURE. itinerary + prefs + clock → PlannedAlarm[]
  content.ts       — PURE. PlannedAlarm → { titleKey, bodyKey, params }
  scheduler.ts     — IMPURE. the only file that imports expo-notifications
  channels.ts      — IMPURE. Android channel registration
  announcements.ts — PURE. see 01 §2
```

**`scheduler.ts` is the only module in the app permitted to import `expo-notifications`.**
Everything else talks to it. One import site means one place to mock, one place to guard for
platform, and one place to audit when the SDK changes.

---

## 2. Reusing the itinerary maths (KTD3)

`lib/bus-tracking.ts` already solves the hard part. Its `legSpans()` returns, for every leg,
`{ stops, start, end }` in **minutes since midnight of the itinerary's departure day**, with
day offsets accumulated *across* legs — so a second bus boarded after midnight is correctly on
day 1 even though its own stop list never wraps.

That module's header records what it cost to get right: legs that "look like they go
backwards" across midnight, stop lists that must never be re-sorted, and a `toISOString()` bug
that anchored a bus leaving in 15 minutes to tomorrow's midnight and showed a 24-hour
countdown. **None of that is re-derived here.**

### 2.1 Required change to `lib/bus-tracking.ts`

Two currently module-private functions must be exported. This is the only change to that file:

```ts
export function legSpans(legs: TrackedLeg[]): { stops: TrackedStop[]; start: number; end: number }[]
export function departureDayStart(searchDate: string | undefined, now: Date): number
```

No behaviour change, no signature change — visibility only. Both are already covered
indirectly by `__tests__/features/transit/pinned-follow.test.ts` and gain direct tests here.

### 2.2 Minutes to instants

```ts
const dayStart = departureDayStart(track.searchDate, now);
const instant = new Date(dayStart + minutes * 60_000);
```

`departureDayStart` parses `searchDate` as a **local** date (`new Date(y, m - 1, d)`), which is
why `localIsoDate()` — not `toISOString()` — must be what wrote it. That invariant already
holds in `buildActiveTrackFromTrip`.

---

## 3. The planner

```ts
export interface PlannedAlarm {
  type: 'leaveNow' | 'change' | 'alight' | 'complete';
  /** Absolute instant to fire. */
  at: Date;
  /** Which leg this concerns — 0-based. */
  legIndex: number;
  /** Interpolation for the copy: stop names, route numbers, minute counts. */
  params: Record<string, string | number>;
}

export function planJourneyAlarms(
  track: Pick<ActiveTrack, 'legs' | 'transfers' | 'searchDate'>,
  prefs: NotificationPrefs,
  now: Date,
): PlannedAlarm[]
```

Pure. No `Date.now()`, no storage, no OS. Returns alarms sorted ascending by `at`.

### 3.1 What each type resolves to

Let `spans = legSpans(legs)`, `first = spans[0]`, `last = spans[spans.length - 1]`.

| Type | Instant, in minutes-since-departure-day | Condition |
|---|---|---|
| `leaveNow` | `first.start − prefs.leaveNow.leadMinutes` | `prefs.leaveNow.enabled` |
| `change` (one per transfer *i*) | `spans[i + 1].start − prefs.change.leadMinutes` | `prefs.change.enabled` and `spans.length > 1` |
| `alight` | `stopMinutes(last.stops[last.stops.length - 2])` | `prefs.alight.enabled` |
| `complete` | `last.end` | `prefs.complete.enabled` |

**`change` fires against the boarding of the *next* leg, not the arrival of the previous one.**
`computeJourneyStatus` already establishes this: during a transfer, `legIndex` is the leg being
*boarded*, "so this names the bus the rider is waiting for rather than the one they just left."
An alarm counting down to a bus the rider is already off is useless.

**`alight` uses the second-to-last stop of the final leg**, which is what "get off at the next
stop" means. Degenerate case: a final leg with fewer than two stops (a legacy record, or a
one-stop hop) has no second-to-last stop; fall back to `last.end − ALIGHT_FALLBACK_MIN` (3),
and if that lands before the leg starts, drop the alarm rather than fire it before boarding.

### 3.2 Tight transfers

`TrackedTransfer.tight` is already computed and already drives copy elsewhere — `computeJourneyStatus`
returns `trackStatusTransferTight` and calls that moment "the one moment this widget earns its
subscription."

A `change` alarm on a tight transfer carries `params.tight = true`, and `content.ts` selects
more urgent copy ([07](./07-i18n-and-copy.md) §4). Same instant, different words.

### 3.3 The past-instant rule (R14)

**Any alarm whose `at <= now` is dropped by the planner**, before it ever reaches the OS.

`scheduleNotificationAsync` with a past `DATE` trigger fires immediately on some platforms. A
rider arming a journey already underway would get "time to leave!" the instant they tapped —
for a bus they are sitting on.

This is not a rare edge. `TransitScreen` defaults the search time to `00:00`
(`DEFAULT_SEARCH_TIME`), which returns the whole service day, so **the results list routinely
contains journeys that have already departed** — the same reality `deriveTrackExpiry`
accommodates with its `MIN_TRACK_TTL_MS` floor, noting that tracking an already-finished trip
"is a legitimate thing to do by accident."

The planner returns whatever survives. If nothing does, it returns `[]`, and the UI refuses the
arm with an explanation rather than filling the bell over nothing ([02](./02-journey-alarms-ux.md) §5).

---

## 4. Content

`content.ts` maps a `PlannedAlarm` to i18n keys plus params — **never to resolved strings**.
Same contract as `TrackLabel` in `lib/bus-tracking.ts`, and for the reason its header records:
this is a paid feature and a Portuguese subscriber was reading it in English.

```ts
export function alarmContent(alarm: PlannedAlarm): { titleKey: string; bodyKey: string; params: … }
```

Resolution happens in `scheduler.ts` via `i18next.t`, against the rider's active locale at
**schedule time**. A rider who changes language after arming keeps the old wording until they
re-arm; re-resolving would mean cancelling and rescheduling every pending alarm on a language
change, which is disproportionate. Noted as a known limitation in [10](./10-rollout-and-risks.md) §5.

---

## 5. The budget guard (KTD5)

iOS retains only the **64 soonest-firing** pending local notifications per app and silently
discards the rest. Android has no equivalent hard cap.

With per-stop alarms rejected, the arithmetic is comfortable:

```
per journey  = 1 (leaveNow) + transfers + 1 (alight) + 1 (complete)
             ≈ 3–5 for a realistic itinerary
MAX_ACTIVE_TRACKS = 5
worst case   ≈ 25, plus 1 announcement = 26
```

Under half the cap. A guard exists anyway, because "unreachable in normal use" is not
"unreachable":

```ts
export const MAX_SCHEDULED_ALARMS = 48;   // headroom below the iOS 64
```

When the total across all armed tracks would exceed it, the scheduler drops **farthest-future
first** and keeps the soonest — matching what iOS would do anyway, but deliberately and with a
log line, rather than invisibly. Announcements are scheduled *before* journey alarms so a
free-tier public-service message is never the thing that gets dropped.

---

## 6. The OS adapter

`scheduler.ts` exposes exactly four operations. Everything else in the app calls these.

```ts
armTrack(track: ActiveTrack, prefs: NotificationPrefs): Promise<string[]>
disarmTrack(track: ActiveTrack): Promise<void>
scheduleAnnouncement(announcement: ServiceAnnouncement): Promise<string | null>
cancelAllScheduledNotifications(): Promise<void>
```

`armTrack` plans, resolves content, schedules each alarm, and returns the OS identifiers. The
caller writes them to `ActiveTrack.notificationIds` (KTD9).

Every one is a **no-op returning empty on a platform without support**, guarded at the top of
the module. Callers never branch on platform.

### 6.1 Cancellation triggers (R13)

Notification ids living on the track means the existing lifecycle *is* the cancellation
lifecycle. Four call sites in `lib/profile-store.ts`, all already present:

| Trigger | Existing code | Added |
|---|---|---|
| Rider stops a track | `stopTracking(id)` | cancel that track's ids |
| Rider disarms the bell | new | cancel, clear `notify` + `notificationIds` |
| Track expires | `pruneTracking(now, dataset)` | cancel ids of every pruned track |
| Active network changes | `pruneTracking(…, dataset)` drops other-dataset tracks | same path — covered |
| Entitlement lapses | new — see [06](./06-premium-gating.md) §3 | cancel all journey alarms |
| Data deleted (DSAR) | `resetAll()` | cancel everything first — see [03](./03-preferences-and-storage.md) §4.2 |

**`pruneTracking` is the one to get right.** It runs on a 30-second interval from
`useBusTracking` and already silently deletes expired tracks. Without cancellation there, a
track that expires while the app is closed leaves its alarms scheduled — and a "get off at the
next stop" fires for a journey the app no longer believes in.

### 6.2 Reconciliation on launch

The OS and the store can drift: an app update, a crash mid-arm, a notification that already
fired. On launch, `scheduler.ts` reconciles once:

1. `getAllScheduledNotificationsAsync()` → the OS's truth.
2. Any id in the OS not referenced by any live track → cancel it (orphan).
3. Any track with `notify` set but whose ids are absent from the OS → if its alarms are still
   in the future, re-arm; if they are all past, clear `notify` and `notificationIds`.

Step 3 is what makes armed state survive an app update, and what stops a filled bell from
lying about alarms the OS no longer holds.
