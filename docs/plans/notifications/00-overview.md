---
title: "feat: notifications — service announcements (free) + premium journey alarms"
status: draft
date: 2026-08-21
type: feat
depth: deep
target_repos:
  - SaoMiguelBus
---

# feat: Notifications

**Target repo:** `SaoMiguelBus` (Expo SDK 56 mobile client) **only**. No `SaoMiguelBus-api`
code change is required. All paths are repo-relative.

---

## 1. Summary

Add notifications to the app, in two classes that share one scheduler:

1. **Service announcements** — free, ungated, for everyone. A one-shot local notification
   fired from configuration the server *already* sends in `bootstrap.transitSchedule`. Its
   first instance is the **1 September 2026 network cutover**: "the timetables changed,
   check your times." The mechanism is general, not a one-off, because a second date
   (14 September, the summer→winter season change) is already documented.
2. **Journey alarms** — premium, per-journey, opt-in. Four alarm types fired against a
   tracked itinerary: *leave now*, *your change is coming*, *get off at the next stop*,
   *you have arrived*. Which types fire, and how many minutes ahead, is chosen by the
   rider and stored device-locally as a default they can override per journey.

Everything is a **local** notification scheduled on-device against instants derived from
data the app already holds. No backend, no push tokens, no operator feed.

---

## 2. Problem frame

### 2.1 The app cannot reach a rider whose phone is in their pocket

`expo-notifications` is not a dependency, and there are zero notification references across
`app/`, `features/`, `lib/`, and `components/`. The consequences are concrete:

- **The premium tracking widget only exists while the app is foregrounded.** `useBusTracking`
  drives it from `setInterval(..., 30_000)` (`features/transit/hooks/useBusTracking.ts:33`).
  Lock the screen and the paid feature stops.
- **The codebase has already conceded this in writing.** `useAutoTrackPinnedRoutes.ts:15-18`:
  > "There is no background execution and no push notification anywhere in this feature, so
  > a sweep on a timer while the app is closed is not something this can honestly offer."
- **The premium tier is sold on it anyway.** `SDD/08-monetization-freemium.md:11-12` lists
  "Real-time GPS alerts" and "Personalized notifications" as premium entitlements.
- **The copy is already translated in all eight locales and rendered by nothing**:
  `premiumFeatureNotifications`, `smartNotificationsFeature`, `smartNotificationsTitle`,
  `busNotificationsText`.

### 2.2 The network changes on 1 September and nothing tells anyone

The cutover instant is `2026-09-01T00:00:00+00:00` (`SaoMiguelBus-api`
`src/transit/tests/test_schedule_phase.py:30`). Departure times genuinely move — route 25 on a
Saturday goes from 8 journeys first-at-08:00 to 10 journeys first-at-06:30
(`docs/azoresbus/99-review-brief.md:94`).

Today the only warning is `ScheduleChangeBanner`, which a rider sees **only if they open the
app**. The rider who most needs the warning is the one who doesn't open it, turns up at the
stop at the old time, and finds the bus gone.

> **Server-side correctness is not at risk.** `resolve_dataset()` flips on the Azores date
> regardless of client version, so an un-updated app still receives correct timetables. This
> plan is only about *telling* people, never about *serving* them the right data.

---

## 3. Scope

### In scope

- `expo-notifications` dependency, plugin configuration, and Android channels.
- A pure scheduling module that turns a tracked itinerary into alarm instants.
- A device-local notification-preferences store.
- A bell CTA on journey and trip cards, premium-gated, that opens the paywall for free users.
- A general service-announcement channel, free and ungated, sourced from bootstrap.
- Strings in all eight locales, analytics, and unit tests.

### Out of scope

- **Any `SaoMiguelBus-api` change.** Explicitly excluded by the scope decision.
- **Remote push notifications.** No token registry, no sender. See [10](./10-rollout-and-risks.md) §6.
- **Expo Web.** This project does not use the web build.
- **Per-stop ("notify at every stop") alarms.** See [04](./04-scheduling-engine.md) §5.
- **Operator disruption push.** `RouteInfo`/`infos` notifications are designed for but not
  built here — see [01](./01-service-announcements.md) §6.
- **Account-synced preferences.** Preferences are device-local by requirement.

---

## 4. Requirements

### Service announcements (free)

- **R1.** The app can fire a one-shot local notification for a named announcement, identified
  by a stable id, at an instant derived from configuration the server already sends.
- **R2.** An announcement fires **at most once per device, ever**, keyed on its id. Reinstalls
  and app updates must not refire an announcement already delivered.
- **R3.** The 1 September network cutover is the first registered announcement. Its fire time
  is the **morning** of the cutover's local date, not the cutover instant itself (which is
  local midnight).
- **R4.** Announcements are free, ungated, and carry no paywall CTA. A rider without premium
  receives them identically to a subscriber.
- **R5.** Tapping an announcement opens the transit screen, where `ScheduleChangeBanner`
  already explains the change in full.
- **R6.** No date literal for the cutover appears in the client where a server-sent instant is
  available. Where a fallback constant is unavoidable it lives in exactly one registry file,
  is clearly labelled, and yields to the server value whenever one is present.

### Journey alarms (premium)

- **R7.** A rider can arm notifications for a specific tracked journey from the same action
  row that already carries track and pin.
- **R8.** Arming is premium-gated through the existing `guardPremiumAction` seam. A free
  rider tapping the bell is shown the RevenueCat paywall; on purchase or restore the arm
  proceeds without a second tap.
- **R9.** Four alarm types are offered: **leave now**, **change is coming**, **get off at the
  next stop**, **journey complete**. Each can be independently enabled.
- **R10.** Lead times are rider-configurable: minutes before departure for *leave now*,
  minutes before boarding for *change*, and stops-or-minutes ahead for *alight*.
- **R11.** Choices are stored as a **global default**, applied to every subsequent arm, and are
  **overridable for an individual journey** at arm time.
- **R12.** Preferences are stored device-locally with no account requirement.
- **R13.** Disarming a journey, stopping its track, its track expiring, or the active network
  changing all cancel that journey's pending notifications.
- **R14.** No alarm is ever scheduled for an instant in the past.
- **R15.** Alarms stand down whenever tracking does — in particular while a rider is previewing
  timetables that are not yet in force.
- **R16.** If premium entitlement lapses, pending journey alarms are cancelled. Announcements
  are unaffected.

### Cross-cutting

- **R17.** Notification permission is requested at the moment the rider first arms something,
  never at launch, and never as a cold prompt on a screen that has not explained why.
- **R18.** Permission is evaluated as **three** states — granted, askable, blocked — never as a
  granted/denied boolean. `requestPermissionsAsync()` is never called while blocked, because it
  resolves denied with no dialog and produces an invisible dead tap.
- **R18a.** A rider who previously refused, and now asks to turn notifications on, is told why no
  dialog appears and is routed to system Settings.
- **R18b.** Returning from Settings with permission granted **completes the action the rider
  started**, rather than leaving them to repeat it.
- **R18c.** The route back is permanently discoverable from `app/settings.tsx`, not only from a
  journey card, and reports the live OS state.
- **R19.** Every user-visible string exists in all eight locale files, keeping
  `__tests__/lib/locale-parity.test.ts` green.
- **R20.** All scheduling logic is pure and unit-tested under the existing `tsx --test` runner.

### Platform compliance ([11](./11-platform-compliance.md))

- **R21.** Android: `SCHEDULE_EXACT_ALARM` is declared, `canScheduleExactAlarms()` is checked
  before every schedule, and its absence never throws. `USE_EXACT_ALARM` is **not** declared —
  it is Play-restricted to alarm and calendar apps, and a rejection would block the whole app.
- **R22.** Without exact-alarm permission, `alight` and `complete` are disabled rather than
  delivered late; `leaveNow` and `change` are offered with an early bias. Copy says *around*, not
  a precise minute.
- **R23.** `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` is never requested.
- **R24.** iOS: `timeSensitive` is claimed only for `leaveNow`, `change`, and `alight`.
  `complete` and announcements are `active`.
- **R25.** **No notification ever contains premium marketing, a paywall prompt, or a
  subscription reminder** — not in content, not via its deep link.
- **R26.** Service announcements have an in-app opt-out, ungated, on both platforms.

---

## 5. Key technical decisions

**KTD1 — Local notifications only; no backend, ever, in this plan.**
Every instant this feature needs is already derivable on-device: journey alarms from the
tracked itinerary's timetable, announcements from `bootstrap.transitSchedule`. Remote push
would add a device-token model, a sender, and Celery scheduling to reach *the same set of
people*, because a push token can only be registered by a build that already ships the
notifications library. Push buys nothing this plan needs and is deferred wholesale.

**KTD2 — One scheduler, two callers.**
Announcements and journey alarms differ in gating, arming, and source, but both reduce to
"fire this content at this instant, once, and be able to cancel it." A single
`lib/notifications/` scheduler owns permission, channels, the OS calls, and the record of what
is pending. `features/transit/` and the announcement registry are callers. This keeps the OS
surface in one place and the domain logic pure.

**KTD3 — The scheduling maths is derived from `legSpans`, not reimplemented.**
`lib/bus-tracking.ts` already computes absolute minute offsets for every leg, transfer and
stop of an itinerary, with midnight-crossing, day-offset and local-vs-UTC bugs already beaten
out of it (see its module header). The alarm planner consumes `legSpans()` output and converts
minutes-since-departure-day to `Date` instants. Re-deriving those offsets would fork the one
piece of this domain that is known-correct.

**KTD4 — Preferences in zustand + AsyncStorage, not SQLite.**
The requirement is *device-local, no account needed*. Both satisfy it; only one is already the
house pattern — `lib/profile-store.ts`, `lib/consent-store.ts` and `lib/personalization-store.ts`
are all `create(persist(..., { storage: createJSONStorage(() => AsyncStorage) }))`.
`expo-sqlite` would be a new native dependency, a new migration story, and a new testing
seam for a preferences object of roughly ten scalar fields.

**KTD5 — No per-stop alarms, so there is no notification budget to manage.**
iOS retains only the **64 soonest-firing** pending local notifications per app and silently
drops the rest. "Notify me at every stop" on a 30-stop journey, across the 5 permitted active
tracks, is ~150 alarms — over the cap, with the overflow discarded invisibly. Capping the
offer at four typed alarms bounds a journey at 2 + *transfers* alarms; five tracks with two
changes each is 20. A defensive global cap still exists ([04](./04-scheduling-engine.md) §5)
but under this design it is unreachable in normal use.

**KTD6 — Announcements are derived from bootstrap, not hardcoded.**
`bootstrap.transitSchedule` already carries `cutoverAt` (an instant), `nextTransitionAt`, and a
`banner` with a stable `id` used as the dismissal key. That is everything an announcement
needs: when, and a dedupe key. Sourcing from it keeps the module's strictest convention intact
— `features/transit/lib/schedule-config.ts` opens with *"No date literal appears here or
anywhere downstream: the only instants are the ones the server sent"* — and means the next
announcement is an admin edit rather than an app release.

**KTD7 — The announcement fire time is derived from the cutover date, not equal to it.**
The cutover instant is local midnight. A notification at midnight is hostile and would be
ignored. The registry derives the fire instant as a configured local morning hour on the
cutover's **local** date, using the same local-date discipline as
`localIsoDate()` in `lib/bus-tracking.ts` — never `toISOString()`, which is UTC and reads as
tomorrow for part of every Azores evening.

**KTD8 — Journey alarms are a third action, not a change to tracking.**
Arming notifications is its own button beside track and pin, and it also starts a track;
starting a track alone never schedules a notification. Folding alarms into the existing track
button would mean subscribers who have tracked journeys for months suddenly start receiving
alerts they never opted into — a change that arrives as a complaint, not a feature. A separate
action also gives the OS permission prompt an honest trigger, and lets "stop notifying me"
mean something other than "stop showing me the countdown."

**KTD9 — Pending notification ids live on the track record.**
Cancellation needs the OS identifiers returned by `scheduleNotificationAsync`. They are stored
on the `ActiveTrack` in `lib/profile-store.ts`, so the existing lifecycle that already removes
tracks — `stopTracking`, `pruneTracking` on expiry, and the dataset-change sweep — becomes the
cancellation trigger for free, with no second source of truth to drift.

---

## 6. Non-goals worth stating explicitly

- **This does not make tracking real-time.** There is no vehicle feed on this network. Every
  instant here is timetable-derived, and the UI must never let an alarm read as a GPS fix —
  the same discipline `journeyPositionLabels` already applies with `trackPositionEstimated`.
- **This does not guarantee delivery.** A device that is off, a permission that was denied or
  later revoked, a Focus mode without the time-sensitive entitlement — all produce silence. Copy
  must never promise certainty.
  > Force-quit is **not** on that list. A scheduled local notification is handed to the OS at
  > arm time and fires regardless of app state, iOS included. What force-quit stops is
  > *background execution* — silent push, background fetch — none of which this feature uses.
  > See [05](./05-permissions-and-lifecycle.md) §5.4.
- **This does not reach a rider who has not updated the app.** Central to the 1 September
  risk; see [10](./10-rollout-and-risks.md) §2.
