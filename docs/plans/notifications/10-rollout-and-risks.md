---
title: "Rollout, risks, and deferred work"
parent: ./00-overview.md
---

# 10 — Rollout and risks

---

## 1. Build order

Sequenced so each step is independently verifiable and nothing is blocked on a decision that
has not been made yet.

| # | Unit | Depends on |
|---|---|---|
| 1 | `expo-notifications` installed, `app.json` plugin + notification icon + `SCHEDULE_EXACT_ALARM` + time-sensitive entitlement, Android channels registered, `setNotificationHandler` wired. **Confirm whether the library guards `canScheduleExactAlarms()` or throws** ([05](./05-permissions-and-lifecycle.md) §4B.2) | — |
| 2 | Export `legSpans` and `departureDayStart` from `lib/bus-tracking.ts` (visibility only) | — |
| 3 | `lib/notifications/plan.ts` + unit tests | 2 |
| 4 | `lib/notifications/content.ts` + unit tests; EN/PT strings | 3 |
| 5 | `lib/notification-prefs-store.ts` | — |
| 6 | `lib/notifications/scheduler.ts` — arm, disarm, cancel-all, reconcile | 1, 3, 4, 5 |
| 7 | `ActiveTrack.notify` + `notificationIds`; cancellation in `stopTracking` and `pruneTracking` | 6 |
| 8 | Preference sheet component | 5 |
| 9 | Bell in `TrackButton` and `JourneyTrackButton`, behind `guardPremiumAction` | 6, 7, 8 |
| 10 | Permission: three-state gate (`granted`/`askable`/`blocked`), request-after-sheet, soft denial line, blocked→Settings sheet, **return-from-Settings resume**, revocation warning | 9 |
| 10a | **Android exact-alarm gate**: `canScheduleExactAlarms()` guard, `ACTION_REQUEST_SCHEDULE_EXACT_ALARM` route, state-changed broadcast, degradation rule (`alight`/`complete` disabled, `leaveNow`/`change` biased early), *around* copy ([05](./05-permissions-and-lifecycle.md) §4B) | 6, 10 |
| 10b | Per-alarm `interruptionLevel` — `timeSensitive` for `leaveNow`/`change`/`alight`, `active` for `complete` and announcements; `threadIdentifier` grouping | 6 |
| 11 | `lib/notifications/announcements.ts` + unit tests | — |
| 12 | `useServiceAnnouncements()` + in-app permission row | 6, 11 |
| 13 | Settings row: defaults editor, premium listing for free riders | 8 |
| 14 | Tap routing, including cold start | 6 |
| 15 | Analytics events | 9, 12 |
| 16 | Entitlement-lapse cancellation | 6, 7 |
| 17 | DSAR: cancel-then-reset in `deleteData`; prefs in export | 6, 5 |
| 18 | Remaining six locales | 4 |
| 19 | Device QA sweep ([09](./09-testing.md) §6) | all |

Units 1–10 are the premium feature; 11–12 are the free announcement channel. **They are
independent** — if the release needs to be split later, the cut runs cleanly between them.

---

## 2. The 1 September reach problem

**Stated plainly, because the decision was taken with it on the table.**

The cutover is `2026-09-01T00:00:00+00:00`. This plan was written on 21 August — **11 days
out**. A local notification fires only if this entire chain completes first:

1. A build with `expo-notifications` reaches both stores
2. Apple and Google review it — a **new permission** is being declared
3. The rider **updates**
4. The rider **opens the app at least once** after updating, so the announcement is scheduled
5. The rider has **granted** notification permission — and per
   [01](./01-service-announcements.md) §4.1, the free channel never cold-prompts, so they must
   also have accepted the in-app row

The bundled-release decision means steps 1–2 wait on the whole premium feature (units 1–19),
not just units 11–12.

**The rider this announcement exists for is the one who won't open the app on 1 September.**
That rider is, by construction, also unlikely to have completed steps 3–5. The reachable
population is close to the population that would have seen `ScheduleChangeBanner` anyway.

### Mitigations, given the decision

- **`ScheduleChangeBanner` is the primary channel for 1 September.** It already exists, already
  has translated copy in eight locales, and reaches every rider who opens the app regardless of
  version. Confirm it is armed and correct before worrying about the notification.
- **Server-side correctness is not at risk.** `resolve_dataset()` flips on the Azores date for
  every client, updated or not. Nobody gets wrong timetables; some people just aren't told.
- **The mechanism's real value is the second date.** 14 September's summer→winter change
  (route 307: 33 → 38 journeys) is far enough out for adoption to matter, and the channel will
  be in place.
- **Measure it.** `announcement_skipped{reason: no_permission}` vs `announcement_scheduled`
  ([08](./08-analytics.md) §2) gives the actual reach number rather than a guess.

> If reaching riders on 1 September turns out to matter more than shipping both halves
> together, the cut between units 10 and 11 is clean and can be made at any point before
> submission.

---

## 3. Release blockers

| Blocker | Status | Detail |
|---|---|---|
| ~~`cutoverAt` must be armed~~ | ✅ **Cleared** | Verified against production 2026-08-21: `cutoverAt = "2026-09-01T00:00:00+00:00"`, `bannerUntil = "2026-10-01T00:00:00+00:00"`, `previewEnabled = true`. Azores is UTC+0 under summer DST, so the offset is local midnight. Phase is `live` throughout the announcement window, so nothing is suppressed. **No config change needed.** The AzoresBus dataset is synced and live |
| ~~Notification icon asset~~ | ✅ **Cleared** | `assets/images/notification-icon.png` in place — 96×96 RGBA, Material `bus_alert` (front-facing bus + alert badge), matching the bus glyph at the centre of the app logo. Verified: all visible pixels pure white (±1), alpha 0→255 across 212 levels (anti-aliased), 10% padding on all four sides, transparent corners. Sourced from an Android Asset Studio density set; the 96×96 xxxhdpi member is the one Expo's config plugin needs |

**No blockers remain.** Both prerequisites outside the app code are satisfied.

### 3.2 Why the icon lives in `assets/`, not `android/app/src/main/res/`

The source set arrived as a full Android density tree (`drawable-mdpi` … `drawable-xxxhdpi`).
It is deliberately **not** copied there:

- **`/android` and `/ios` are gitignored** (`.gitignore:41-42`). Native-tree drawables would be
  untracked, absent on a fresh clone, and destroyed by the next `npx expo prebuild`.
- The `expo-notifications` config plugin takes **one** source image and generates every density
  bucket itself at prebuild time, referencing its own generated resource name. Hand-placed
  `ic_stat_bus_alert` drawables would be unreferenced dead weight alongside it.

So the single 96×96 lives in tracked `assets/`, and the plugin does the rest. The other four
densities are redundant under this setup.

### 3.1 `trackingEnabled: false` is a dead flag — do not act on it

Production carries `"trackingEnabled": false` in the same block, which reads as though premium
bus tracking is switched off. It is not.

`resolveScheduleUi` computes `showTracking: Boolean(config?.trackingEnabled)`
(`features/transit/lib/schedule-config.ts:114`) and exposes it on `ScheduleUi` — **and no
component in the app reads it.** The only consumers of the whole `ScheduleUi` tracking concept
go through `canTrackTrips`, which is `canTrack()` → `!showPreviewWarning` and never consults
`trackingEnabled`.

Two consequences:

- **The bell must gate on `canTrackTrips`, not `trackingEnabled`** ([02](./02-journey-alarms-ux.md) §3.1).
  Gating on the flag would ship a feature that is invisible in production for a reason nobody
  would find.
- **Do not "fix" this by setting the flag to `true`** as part of this work. Either wire
  `showTracking` up deliberately or delete it — but that is a separate change with its own
  blast radius, and flipping a flag whose only consumer is dead code is a no-op that looks like
  a fix.

---

## 4. Store review

| Item | Note |
|---|---|
| **New permission declared** | Both stores flag this. Expect the usual review, and submit with margin |
| **iOS: no background modes** | These are *local* notifications. Do **not** add `UIBackgroundModes` — declaring capabilities the app does not use invites rejection |
| **iOS privacy manifest** | Unchanged. Local scheduling touches none of the declared `NSPrivacyAccessedAPITypes`, and this feature collects nothing |
| **Android 13+ `POST_NOTIFICATIONS`** | Added by the plugin; requested at runtime per [05](./05-permissions-and-lifecycle.md) §2 |
| **Android `SCHEDULE_EXACT_ALARM`** | Declared manually. Play-safe — it is `USE_EXACT_ALARM` that is restricted to alarm/calendar apps, and we do **not** declare it ([11](./11-platform-compliance.md) §A1) |
| **iOS time-sensitive entitlement** | Reviewed by hand. Include an App Review note: *"Time-sensitive notifications are used for public-transport departure, connection, and alighting alerts, where a delayed or summarised notification causes the user to miss their bus. Notifications are user-armed per journey and can be turned off individually."* |
| **Guideline 4.5.4** | No notification carries marketing or a paywall (R25); service announcements have an ungated in-app opt-out (R26) |
| **Google Play Data Safety** | No change — nothing new is collected or transmitted |
| **Version bump** | `app.json` `version` patch segment, per the standing project rule. `android.versionCode` increments as usual |

---

## 5. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| 1 September announcement reaches few riders | **High** | Medium | §2. Banner is primary; measure actual reach |
| ~~`cutoverAt` never armed~~ | — | — | Cleared — verified armed in production, §3 |
| Dedupe keyed on the phase-resolved `banner.id` | Medium | Medium | The deployed banner carries a `phases.preview` override that changes its `id` at the cutover instant. Key on `cutoverAt` instead ([01](./01-service-announcements.md) §3.1.1); regression-tested in [09](./09-testing.md) §3 |
| Permission denied at the prompt | Medium | High per-rider | Prompt at highest intent ([05](./05-permissions-and-lifecycle.md) §2.1); recoverable via the Settings route and permanently reachable from the settings row |
| **`requestPermissionsAsync()` called while blocked → invisible dead tap** | **Medium if unguarded** | High | Branch on the three-state gate ([05](./05-permissions-and-lifecycle.md) §2.0). The OS shows nothing and resolves denied instantly, so the rider presses a button and sees no response. Same class as `b764b2a`, *"a paywall that cannot be shown must not be a dead tap"* — one denial on iOS, two on Android 13+, reaches this state permanently |
| Rider grants in Settings and returns to an unchanged screen | Medium | Medium | Pending-intent resume on foreground ([05](./05-permissions-and-lifecycle.md) §3.3). Without it the trip to Settings appears to have achieved nothing and the rider must redo the whole flow |
| **Android alarms delivered 10–30 min late** | **High if unguarded** | **High** | The headline finding of the compliance sweep. `SCHEDULE_EXACT_ALARM` is denied by default on Android 14+ for new installs, and an inexact alarm is delayed by *at least* 10 minutes — a missed bus, from a notification the rider trusted. Gate + degradation rule ([05](./05-permissions-and-lifecycle.md) §4B) |
| **`SecurityException` crash scheduling an exact alarm without permission** | Medium | **High — a crash** | Guard on `canScheduleExactAlarms()`. Whether `expo-notifications` already guards is undocumented; confirm in unit 1, do not assume ([05](./05-permissions-and-lifecycle.md) §4B.2) |
| Play rejection for a restricted alarm permission | Low | **Very high — blocks the whole app** | Declare `SCHEDULE_EXACT_ALARM`, never `USE_EXACT_ALARM`. The latter is restricted to alarm/calendar apps and this is a nine-module hub ([11](./11-platform-compliance.md) §A1) |
| Apple questions the time-sensitive entitlement | Low | Medium | Claim it for three alarm types, not four (R24). A "you have arrived" alert marked Focus-breaking is what invites the question |
| iOS Focus mode swallows a journey alarm | **Medium** | High | Set `interruptionLevel: 'timeSensitive'` on journey alarms and declare the `com.apple.developer.usernotifications.time-sensitive` entitlement ([05](./05-permissions-and-lifecycle.md) §4A.2). Without it a commuting rider with Focus on gets nothing — and that is exactly the target rider |
| Apple queries the time-sensitive entitlement at review | Low | Medium | Transit departure alerts are within Apple's stated intent for the level. State the use plainly in the App Review note |
| Alarms fire for a stale itinerary | Medium | High | Cancellation on `pruneTracking`, dataset change, and expiry ([05](./05-permissions-and-lifecycle.md) §5.2). The most likely source of a genuinely bad bug |
| Notification fires for an already-departed journey | Medium | Medium | Past-instant rule (R14), unit-tested exhaustively ([09](./09-testing.md) §2) |
| Locale parity break | Medium | Low (CI catches it) | ~40 keys × 8 files; translate in one commit |
| Android channel importance set wrong on first run | Low | High | Channels are **immutable** after creation — a mistake needs a new channel id, not a patch. Verify on a clean install before release |
| Wording resolved at arm time goes stale on language change | Low | Low | Accepted limitation ([04](./04-scheduling-engine.md) §4) |
| Rider annoyance / notification fatigue | Low | Medium | Opt-in per journey, four types max, `complete` off by default, pinned-route arming off by default |

---

## 6. Deferred

Each of these was considered and consciously left out. Recorded so the seams are not
accidentally closed.

### Remote push
No device-token model, no sender, no Celery scheduling — and out of repo scope. Worth noting
that push would **not** have rescued the 1 September timing: a push token can only be registered
by a build that already ships the notifications library, so it is gated on the same steps 1–4
in §2. What push *would* unlock is the class of message local scheduling cannot express at all —
"your bus is cancelled", "the operator moved this departure" — because those instants are not
knowable on-device. That is the case to reopen this on, not the cutover.

### Per-stop alarms
Rejected on the iOS 64-pending cap (KTD5). Would need the rolling-window scheduler described
and set aside in [04](./04-scheduling-engine.md) §5, and would still degrade badly on a device
that is never opened mid-journey.

### Operator disruption notices
`infos` → `AlertBell` is in-app and silent today. The registry shape accommodates them
([01](./01-service-announcements.md) §6); the open question is editorial — how many
notifications an operator may send, and who decides. Deserves its own decision.

### Account-synced preferences
Device-local by requirement, since not every rider signs in. If it is ever wanted, the shape in
[03](./03-preferences-and-storage.md) §2 is a flat serialisable object that would drop into a
profile payload unchanged.

### Web
Not used by this project.

### Geofenced arrival alerts
Device-GPS proximity — "your stop is approaching" by location rather than timetable — is what
`SDD/09-modules.md` means by premium "GPS proximity alerts". `expo-location` is already a
dependency and already used by `features/traffic/hooks/useProximityAlert.ts`. It would make the
`alight` alarm accurate on a late bus rather than merely scheduled. Deliberately out of scope
here: it needs background location, which is a materially larger permission ask
(`isIosBackgroundLocationEnabled` is currently `false` in `app.json`) and a separate battery
and privacy conversation.
