---
title: "Testing"
parent: ./00-overview.md
---

# 09 — Testing

Satisfies **R20**.

---

## 1. What the runner can and cannot do

```
npm run test:unit
→ npx tsx --test __tests__/lib/*.test.ts __tests__/features/**/*.test.ts
```

`node:test` via `tsx`. **No React Native runtime, no renderer, no native modules.** Every one of
the ~90 existing test files tests a pure function. `__tests__/features/transit/pinned-follow.test.ts`
and `schedule-config.test.ts` are the closest models for this work.

This is the reason for the module split in [04](./04-scheduling-engine.md) §1: `plan.ts`,
`content.ts` and `announcements.ts` are pure and fully testable; `scheduler.ts` and
`channels.ts` are thin, impure, and covered by device QA (§6) rather than unit tests.

**Do not add a renderer or a native mock layer for this feature.** Introducing one would be a
larger change to the repo's testing posture than the feature itself.

---

## 2. `__tests__/lib/notification-plan.test.ts`

The centre of gravity. Fixtures come from `__tests__/fixtures/azoresbus/` — `journey_25_488.json`,
`journey_48_950.json`, `journey_53_984.json` are real multi-leg journeys already used by
`pinned-follow.test.ts`.

### Instants

- Direct journey, all four types enabled → exactly 3 alarms (no `change`), ascending by `at`.
- Two-leg journey → exactly one `change` alarm, at `spans[1].start − leadMinutes`, **not** at
  leg 0's arrival.
- Three-leg journey → two `change` alarms, one per transfer, in order.
- `leaveNow` honours `leadMinutes`: 10 vs 30 shifts the instant by exactly 20 minutes.
- `alight` lands on the **second-to-last** stop of the **final** leg, not of leg 0.
- `complete` lands on `last.end`.

### Past-instant filtering (R14) — the highest-value cases

- `now` after the whole journey → `[]`.
- `now` mid-journey → `leaveNow` and any passed `change` dropped; `alight` and `complete` kept.
- `now` exactly on an alarm instant → dropped (`at <= now`, not `<`).
- `leadMinutes` large enough to push `leaveNow` before `now` → that alarm dropped, the rest kept.

### Midnight and day offsets

This is where the reused maths earns its place — each mirrors a bug `lib/bus-tracking.ts`
records having already been fixed:

- Leg running 23:50 → 00:10: `alight` and `complete` land on **day 1**, not 23 hours in the past.
- Two legs where the change spans midnight (23:55 → 00:20): the second leg's `change` alarm is
  on day 1, driven by the boundary between legs, since neither leg's own stop list wraps.
- A journey with `searchDate` set to tomorrow: every instant is 24h later, not today.
- **The `toISOString()` trap:** a `searchDate` written by `localIsoDate()` at 23:30 Azores
  winter (UTC−1) must produce instants on the correct local day. Constructing the same fixture
  with a UTC-derived date must be visibly wrong — this test exists to stop anyone "simplifying"
  `departureDayStart`.

### Preferences

- Every type disabled → `[]`.
- Only `alight` enabled → exactly 1 alarm.
- `change` enabled on a direct journey → no alarm, no crash.

### Degenerate input

- `legs: []` → `[]` (the shape `liftTrackedRecord` deliberately preserves for unmigrated records).
- Final leg with 1 stop → `alight` falls back to `end − ALIGHT_FALLBACK_MIN`, or is dropped if
  that precedes the leg's start.
- A leg with no stops → filtered, exactly as `trackLegs` already does.

---

## 3. `__tests__/lib/notification-announcements.test.ts`

`resolveAnnouncements(config, { now, announceHour })` — pure, clock injected.

| Case | Expected |
|---|---|
| `cutoverAt: null` | `[]` |
| `phase: 'settled'` | `[]` |
| `cutoverAt` tomorrow, `now` today | one announcement at `announceHour` local on the cutover's local date |
| `cutoverAt` today, `now` **after** `announceHour` | `[]` — the past-instant rule ([01](./01-service-announcements.md) §3.3) |
| `cutoverAt` today, `now` **before** `announceHour` | one announcement, later today |
| `cutoverAt` in the past by days | `[]` |
| `cutoverAt` given in a non-UTC offset (`2027-01-01T00:00:00-01:00`) | fires on the correct **local** date — mirrors `test_schedule_phase.py:83`, which exists because a winter cutover at local midnight is 01:00 UTC |
| **Production config, phase `preview` vs `live`** | the **same** dedupe id both times. Fixture uses the deployed banner, whose `phases.preview` override changes `banner.id` from `azoresbus-live-2026-09` to `azoresbus-preview-2026-08` — the id must be derived from `cutoverAt`, never from the resolved banner ([01](./01-service-announcements.md) §3.1.1) |
| `banner: null` entirely | still resolves an announcement — the id does not depend on the banner |
| `cutoverAt` changed by the operator | a different dedupe id, so a moved date correctly re-announces |

---

## 4. `__tests__/lib/notification-content.test.ts`

- Every `PlannedAlarm` type maps to a `titleKey`/`bodyKey` **that exists in `locales/en.json`**.
  Assert against the real file — a typo'd key otherwise ships as a blank lock-screen line.
- A `change` alarm with `tight: true` selects the tight variants; `false` selects the plain ones.
- Params carry `minutes`, never `count` ([07](./07-i18n-and-copy.md) §2 rule 4).
- Every `{{placeholder}}` in the EN string is present in the params object for that type.

---

## 5. Existing suites that must stay green

| Suite | Why it is at risk |
|---|---|
| `__tests__/lib/locale-parity.test.ts` | ~40 new keys across 8 files. Will fail on the first partial translation |
| `__tests__/features/transit/pinned-follow.test.ts` | Exercises `legSpans` indirectly; the export change in [04](./04-scheduling-engine.md) §2.1 must be visibility-only |
| `__tests__/features/transit/premium-pinned-journeys.test.ts` | Touches the track/pin premium gating the bell now sits beside |
| `__tests__/features/transit/schedule-config.test.ts` | `canTrack` now also gates the bell |

---

## 6. Device QA — what unit tests cannot reach

Everything in `scheduler.ts` and `channels.ts`, plus everything about the OS. Run on **both**
platforms; the failure modes differ.

### Permission
- [ ] First arm shows the OS prompt *after* the preference sheet, not before
- [ ] Denying leaves the bell empty and shows the settings nudge
- [ ] `Open settings` lands on the app's notification settings
- [ ] Revoking permission in system settings, then foregrounding, shows the inline warning
- [ ] Re-granting restores delivery of still-pending alarms
- [ ] Android 13+ specifically: `POST_NOTIFICATIONS` is requested (not silently assumed)

### Delivery
- [ ] Alarm fires with the app **backgrounded**
- [ ] Alarm fires with the app **force-quit** — iOS is the risk here
- [ ] Alarm fires with the device locked, and is legible on the lock screen
- [ ] Foreground delivery shows a banner (`setNotificationHandler`)
- [ ] Android: journey alarms are `HIGH` (heads-up), announcements are `DEFAULT` (quiet)
- [ ] Android: the notification icon is a white silhouette, not a grey square

### Cancellation
- [ ] Disarming cancels pending alarms — verify nothing fires afterwards
- [ ] Stopping the track cancels them
- [ ] Letting a track expire (via `pruneTracking`) cancels them
- [ ] Switching network dataset cancels them
- [ ] "Delete my data" cancels them **and** wipes preferences ([03](./03-preferences-and-storage.md) §4.2)

### Lifecycle
- [ ] Armed alarms survive an app update (reconciliation, [04](./04-scheduling-engine.md) §6.2)
- [ ] Uninstall/reinstall fires no stale announcement
- [ ] Cold-start tap on a notification routes correctly (`getLastNotificationResponseAsync`)
- [ ] Background tap routes correctly (response listener)
- [ ] Locale switch after arming: pending alarms keep old wording, new arms use the new locale
      (the accepted limitation in [04](./04-scheduling-engine.md) §4)

### Announcement, on a simulated cutover
`app/settings.tsx` already has a **Simulate cutover** developer control
(`settingsSimulateCutover`, phases `off` / `live` / `settled`) driving `simulatePhase()`. Use it
rather than moving the device clock:

- [ ] With a cutover armed for tomorrow, the announcement schedules
- [ ] With `phase: 'settled'`, nothing schedules
- [ ] Firing it once, then relaunching several times, produces exactly one notification
- [ ] Tapping it lands on transit with `ScheduleChangeBanner` visible

---

## 7. Coverage intent

Pure modules — `plan.ts`, `content.ts`, `announcements.ts` — should be covered exhaustively;
they are small, total, and every branch is cheap to reach. `scheduler.ts` and `channels.ts` are
deliberately kept thin enough that reading them is the review, and §6 is the verification.
