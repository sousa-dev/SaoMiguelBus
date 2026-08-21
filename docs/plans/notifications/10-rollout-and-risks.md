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
| 1 | `expo-notifications` installed, `app.json` plugin + notification icon, Android channels registered, `setNotificationHandler` wired | — |
| 2 | Export `legSpans` and `departureDayStart` from `lib/bus-tracking.ts` (visibility only) | — |
| 3 | `lib/notifications/plan.ts` + unit tests | 2 |
| 4 | `lib/notifications/content.ts` + unit tests; EN/PT strings | 3 |
| 5 | `lib/notification-prefs-store.ts` | — |
| 6 | `lib/notifications/scheduler.ts` — arm, disarm, cancel-all, reconcile | 1, 3, 4, 5 |
| 7 | `ActiveTrack.notify` + `notificationIds`; cancellation in `stopTracking` and `pruneTracking` | 6 |
| 8 | Preference sheet component | 5 |
| 9 | Bell in `TrackButton` and `JourneyTrackButton`, behind `guardPremiumAction` | 6, 7, 8 |
| 10 | Permission flow: request-after-sheet, denial nudge, revocation warning | 9 |
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

Neither is code in this repo. Both will silently produce "the feature does nothing."

| Blocker | Owner | Detail |
|---|---|---|
| **`cutoverAt` must be armed** | Ops / admin | `src/transit/migrations/0008_seed_azoresbus_flags.py` ships it **deliberately null**. `Island.feature_flags` is a `JSONField` on an editable admin, so this is a **Django-admin edit, not an API code change** — available under this plan's repo scope. With it null, `resolveAnnouncements` correctly returns `[]` and no announcement ever schedules |
| **Notification icon asset** | Design | `assets/images/notification-icon.png`, white-on-transparent silhouette. Shipping the app icon here produces the grey square on Android |

---

## 4. Store review

| Item | Note |
|---|---|
| **New permission declared** | Both stores flag this. Expect the usual review, and submit with margin |
| **iOS: no background modes** | These are *local* notifications. Do **not** add `UIBackgroundModes` — declaring capabilities the app does not use invites rejection |
| **iOS privacy manifest** | Unchanged. Local scheduling touches none of the declared `NSPrivacyAccessedAPITypes`, and this feature collects nothing |
| **Android 13+ `POST_NOTIFICATIONS`** | Added by the plugin; requested at runtime per [05](./05-permissions-and-lifecycle.md) §2 |
| **Google Play Data Safety** | No change — nothing new is collected or transmitted |
| **Version bump** | `app.json` `version` patch segment, per the standing project rule. `android.versionCode` increments as usual |

---

## 5. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| 1 September announcement reaches few riders | **High** | Medium | §2. Banner is primary; measure actual reach |
| `cutoverAt` never armed | Medium | High | §3 — call it out in the release checklist, not in a code comment |
| Permission denied at the prompt | Medium | High per-rider | Prompt at highest intent ([05](./05-permissions-and-lifecycle.md) §2.1); recoverable via the settings nudge |
| iOS force-quit suppresses delivery | Low | Medium | Platform behaviour, not fixable. Copy never promises certainty ([07](./07-i18n-and-copy.md) §2 rule 2) |
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
