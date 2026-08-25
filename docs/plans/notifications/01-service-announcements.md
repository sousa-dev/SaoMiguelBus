---
title: "Service announcements — the free broadcast channel"
parent: ./00-overview.md
---

# 01 — Service announcements

Free, ungated, one-shot notifications about the transit service itself. Satisfies **R1–R6**.

The first instance is the 1 September 2026 network cutover. The mechanism is deliberately
general: a second date (14 September, when the summer season ends and route 307 goes from 33
to 38 journeys — `SaoMiguelBus-api` `src/azoresbus/migrations/0002_periodic_tasks.py:75`) is
already known, and writing this twice under deadline is the outcome to avoid.

---

## 1. Why this is not premium

Journey alarms are a personal convenience and are worth charging for. "The timetable you are
relying on is now wrong" is not a convenience — it is the app correcting information it
previously gave you.

Gating it fails on its own terms: a free rider who taps a paywall instead of reading the
warning **has not been warned**. The paywall would convert a safety message into a sales
message at the exact moment the rider needed the safety message. Free, ungated, no CTA.

---

## 2. Shape

```
lib/notifications/announcements.ts     — the registry + resolution logic (PURE)
lib/notifications/announcement-store.ts — which ids have already fired (persisted)
features/transit/hooks/useServiceAnnouncements.ts — the hook that arms them
```

### 2.1 The announcement descriptor

```ts
export interface ServiceAnnouncement {
  /** Stable dedupe key. Once fired for this id, never fires again on this device. */
  id: string;
  /** Absolute instant to fire. */
  fireAt: Date;
  /** i18n key for the notification title. */
  titleKey: string;
  /** i18n key for the notification body. */
  bodyKey: string;
  /** Where a tap lands. */
  route: string;
}
```

Content is carried as **i18n keys, never as resolved strings** — the same discipline
`lib/bus-tracking.ts` applies to `TrackLabel`, and for the same reason: a Portuguese
subscriber was once reading a paid widget in English (`09 §2 Gap D`). Resolution to text
happens at the scheduling call site, against the rider's active locale.

### 2.2 Resolution is a pure function

```ts
export function resolveAnnouncements(
  config: TransitScheduleConfig | null | undefined,
  options: { now: number; announceHour: number },
): ServiceAnnouncement[]
```

Takes the bootstrap block and the clock, returns zero or more announcements. No I/O, no
storage, no `Date.now()` inside — every input is a parameter, which is what makes the whole
of §3 unit-testable ([09](./09-testing.md)).

---

## 3. The cutover announcement

### 3.1 Source fields — all already sent by the server

`bootstrap.transitSchedule` (`lib/types.ts:67-79`) is admin-editable JSON on
`Island.feature_flags`, and the client already reads it in `useScheduleConfig`. Three fields
carry everything an announcement needs:

| Field | Used for |
|---|---|
| `cutoverAt` | The instant the network changes — the basis for **both** the fire time and the dedupe key |
| `phase` | Suppression: nothing is announced once the phase is `settled` |

**Verified against production** (`sao-miguel` `feature_flags.azoresbus`, read 2026-08-21):

```json
"cutoverAt":   "2026-09-01T00:00:00+00:00",
"bannerUntil": "2026-10-01T00:00:00+00:00",
"previewEnabled": true
```

The cutover **is armed**, at Azores local midnight on 1 September (Azores is UTC+0 under summer
DST, so the `+00:00` offset is local midnight, not an hour out). `bannerUntil` a month later
means the phase is `live` — not `settled` — throughout the announcement window, so nothing is
suppressed. No configuration change is required for this plan.

> The seed migration `0008_seed_azoresbus_flags.py` ships `cutoverAt` as `null` on purpose, but
> it merges as `{**FLAGS, **existing}` — *"Never clobber an operator's edits: only fill in what
> is missing"* — so the operator's armed value survives the migration. The migration having run
> does **not** mean the flag is null.

### 3.1.1 Why the dedupe key is NOT `banner.id`

The obvious choice is wrong, and their production config is what exposes it.

`resolveBanner()` merges a per-phase override **including its `id`**
(`features/transit/lib/schedule-config.ts:84-88`), and the deployed banner carries exactly such
an override:

| Phase | Window | Resolved `banner.id` |
|---|---|---|
| `preview` | until 31 Aug | `azoresbus-preview-2026-08` |
| `live` | 1 Sept → 1 Oct | `azoresbus-live-2026-09` |

**The id changes at the precise moment the announcement fires.** Scheduling happens during
`preview` and records `azoresbus-preview-2026-08`; the next resolution runs during `live`, sees
`azoresbus-live-2026-09`, finds no match in the fired store, and schedules again. Only the
past-instant rule (§3.3) would stop a duplicate — a correctness guarantee resting on two
unrelated rules happening to interact.

The dedupe key is therefore derived from the **cutover instant itself**:

```ts
const announcementId = `cutover:${config.cutoverAt}`;   // "cutover:2026-09-01T00:00:00+00:00"
```

Stable across every phase, and it changes exactly when it should — if the operator moves the
date, that is a genuinely new announcement and re-firing is correct. `banner.id` is left to do
the one job it was designed for: banner dismissal.

### 3.2 Deriving the fire instant (KTD7)

The cutover is local **midnight**. The requirement is the **morning**. So:

1. Convert `cutoverAt` to the local calendar date it falls on.
2. Construct a local instant at `announceHour` on that date — `new Date(y, m - 1, d, 7, 0, 0)`.
3. If that instant is already in the past, return no announcement.

Step 1 uses local-date construction, never `toISOString()`. `lib/bus-tracking.ts` documents
exactly why with a worked example: at 23:30 Azores winter (UTC−1) `toISOString()` already
reads *tomorrow*, which previously anchored a bus leaving in 15 minutes to tomorrow's midnight
and displayed a ~24 hour countdown. The same class of bug here would fire the announcement on
2 September.

`announceHour` is a module constant (`ANNOUNCE_HOUR_LOCAL = 7`) passed in as a parameter, so
tests can vary it without touching the clock.

### 3.3 The past-instant rule

A rider who first opens the app at 09:00 on 1 September must **not** receive a notification for
07:00 that morning. `scheduleNotificationAsync` with a past `DATE` trigger delivers
immediately on some platforms, which would fire a "check your times" alert as a startled
duplicate of the banner already on screen.

Rule: **if `fireAt <= now`, the announcement is not scheduled.** The rider gets
`ScheduleChangeBanner` instead, which is the better surface for someone already looking at the
app. This is the single most important test case in [09](./09-testing.md) §3.

### 3.4 Dedupe

`announcement-store.ts` persists a map of `id → firedAt`, keyed on the cutover-derived id from
§3.1.1. Before scheduling, the id is checked; after a successful `scheduleNotificationAsync`, it
is recorded. Three properties follow:

- **Rescheduling is idempotent.** The arming hook runs on launch and on foreground; only the
  first run schedules anything.
- **An id already scheduled-but-not-yet-fired is not rescheduled**, so a rider who opens the
  app four times on 31 August gets one notification on 1 September, not four.
- **Crossing a phase boundary changes nothing.** Because the key is the cutover instant rather
  than the phase-resolved `banner.id`, the app resolving the same announcement on 31 August
  (`preview`) and 1 September (`live`) computes the identical key both times.

Uninstall clears both the store and the OS's pending notifications together, so a reinstall is
correctly treated as a fresh device.

### 3.5 Copy

The strings already exist, translated in all eight locales, and are already the app's own
rather than the server's — `ScheduleChangeBanner` deliberately prefers app-local copy for the
`live` phase so that all eight languages are edited together:

- `transitScheduleLiveBanner` — *"The new bus network timetables are now in force and available
  in this app."* / *"Os novos horários da rede de autocarros já estão em vigor e disponíveis
  nesta aplicação."*

The notification needs a title and a body with a slightly different job — the banner explains,
the notification must prompt an action. New keys, specified in [07](./07-i18n-and-copy.md) §3:

| Key | English |
|---|---|
| `notificationScheduleChangeTitle` | The bus timetables have changed |
| `notificationScheduleChangeBody` | New times are in force from today. Check your bus before you leave. |

### 3.6 Tap target

The notification carries `data: { route: '/(tabs)/transit' }`. The response listener routes
there, where `ScheduleChangeBanner` is already rendered and already carries the full
explanation and, where offered, the preview toggle. Deep-link handling is specified in
[05](./05-permissions-and-lifecycle.md) §6.

---

## 4. Arming

`useServiceAnnouncements()` is mounted once in the app shell, beside the existing
`useAutoTrackPinnedRoutes()`. It:

1. Reads `bootstrap.transitSchedule` via `useBootstrapCached()`.
2. Calls `resolveAnnouncements(config, { now: Date.now(), announceHour: ANNOUNCE_HOUR_LOCAL })`.
3. Filters out ids already in the fired store.
4. For anything left, ensures permission (see below) and schedules.

Runs on launch and on `AppState` → `active`, matching the sweep cadence in
`useAutoTrackPinnedRoutes`. It is cheap: with nothing to announce it is a null check on a
cached object.

### 4.1 Permission, for a free rider with no journey alarms

This is the awkward case. A free rider has no reason to have granted notification permission,
and prompting cold at launch for an announcement they cannot see the value of is exactly the
prompt users deny permanently.

**Rule: the announcement channel never triggers a cold OS prompt.** It schedules only if
permission is *already* granted. If it is not, the rider is offered it in context instead — a
dismissible in-app row on the transit screen, shown only when an announcement is pending and
permission is absent:

> **Get told when timetables change** — We'll send one notification when the bus times change.
> [Turn on] [Not now]

Tapping *Turn on* requests OS permission; on grant, the pending announcement is scheduled
immediately. Dismissal is remembered by announcement id, so it is asked at most once per
announcement. Full flow in [05](./05-permissions-and-lifecycle.md) §2.

> This is why the one-release decision has real cost: the 1 September announcement now depends
> on the rider having *also* seen and accepted this row before the date. See
> [10](./10-rollout-and-risks.md) §2.

---

## 5. Suppression rules

| Condition | Behaviour |
|---|---|
| `cutoverAt` is null | Nothing resolved, nothing scheduled |
| `phase === 'settled'` | Nothing resolved — the changeover is old news |
| Derived `fireAt` is in the past | Not scheduled (§3.3) |
| Id already fired on this device | Not scheduled |
| Permission not granted | Not scheduled; in-app row offered instead |
| Rider is previewing the new timetables | **Still scheduled.** Previewing means they are interested, not that they know the date |
| Rider is premium | No difference whatsoever |

---

## 6. Designed for, not built: operator disruption notices

`RouteInfo` rows already flow through bootstrap as `infos` and are rendered by
`features/transit/components/AlertBell.tsx` — in-app only, and silent. A new notice about a
cancelled line today reaches nobody who is not already looking.

The registry shape in §2.1 accommodates them: an `infos` entry has an id and localized text
(`lib/infos.ts` `resolveInfo`), so it needs only a fire instant. The natural rule is "fire once,
shortly after the app first observes a notice it has not seen before."

**Not built here** because it is a different product question — how many notifications is an
operator allowed to send, and who decides — that deserves its own decision rather than being
smuggled in behind a cutover announcement. The seam is left open, not filled.
