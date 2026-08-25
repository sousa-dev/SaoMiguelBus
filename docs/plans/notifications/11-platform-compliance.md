---
title: "Apple and Google platform compliance"
parent: ./00-overview.md
---

# 11 — Platform compliance

Every rule this feature has to satisfy on each store, what the plan does about it, and the two
places the earlier drafts were non-compliant or wrong.

**Two findings here change the design**, not just the documentation:

- **[A1]** Android exact alarms — without a permission the plan never declared, every alarm can
  be delivered **10–30 minutes late**. For "time to leave" that is worse than sending nothing.
- **[I2]** Marking all four alarm types `timeSensitive` over-claims an entitlement Apple reviews
  by hand. `complete` must not carry it.

---

## Part A — Google Play / Android

### A1. Exact alarms — the finding that changes the design

**The problem.** Android 12+ restricts exact alarms. Without one, `AlarmManager` may delay a
scheduled alarm: the system *"can delay the invocation of a time-windowed inexact alarm by at
least 10 minutes"*, and in Doze *"a notification might get delivered at the next window which may
be +10-30 minutes later depending on the phone."*

A bus alarm delivered 20 minutes late is not a degraded feature. It is an **actively harmful**
one — the rider trusted it, didn't check the app, and missed the bus. Silence would have been
better.

Expo's own docs state the requirement plainly, and it contradicts an earlier draft of
[05](./05-permissions-and-lifecycle.md) §1.3 that claimed the plugin handled everything:

> "For Android 12 and higher, developers must **manually add the `SCHEDULE_EXACT_ALARM`
> permission** to the manifest to trigger notifications at precise times."

**The two permissions, and why we take the harder one.**

| | `USE_EXACT_ALARM` | `SCHEDULE_EXACT_ALARM` |
|---|---|---|
| Granted | Automatically, at install | By the user; **denied by default on Android 14+** for apps targeting API 33+ |
| Play policy | **Restricted.** Only for apps whose *core, user-facing functionality* requires precise timing — "dedicated alarm, timer, or calendar applications" | Unrestricted; Google explicitly directs everyone else here |
| Risk | A policy rejection blocks the release | An extra permission prompt |

**Decision: `SCHEDULE_EXACT_ALARM`.** São Miguel Hub is a nine-module island companion —
transit, news, seismic, trails, marketplace, traffic, tours, weather, minibus. Its core
user-facing functionality is emphatically *not* an alarm clock. Declaring `USE_EXACT_ALARM`
invites a Play policy rejection, and a rejection blocks the **entire app update**, not just this
feature. That is a wildly disproportionate risk to accept for one premium add-on, and Google's
own migration guidance sends non-alarm apps to `SCHEDULE_EXACT_ALARM` by name.

**Implementation requirements:**

1. Declare `SCHEDULE_EXACT_ALARM` in `app.json` under `android.permissions`.
2. **Check `canScheduleExactAlarms()` before scheduling.** Calling `setExact()`,
   `setExactAndAllowWhileIdle()` or `setAlarmClock()` without the permission throws a
   **`SecurityException`** — a crash, not a degraded notification.
3. When it is denied, offer `Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM`, which opens the
   system screen for it. Same return-and-resume flow as
   [05](./05-permissions-and-lifecycle.md) §3.3.
4. Observe `AlarmManager.ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED` so a grant made
   outside the app is picked up.

> **Verify what `expo-notifications` actually does here.** Its docs say the permission enables
> precise triggering, but whether the library checks `canScheduleExactAlarms()` itself and
> degrades, or lets the `SecurityException` propagate, is **not documented and must be confirmed
> against the installed version** during build unit 1. A related crash is a known failure mode in
> the equivalent Flutter library. Do not assume it is handled.

### A1.1 Degradation rule when exact alarms are unavailable

Not every alarm type degrades equally, so they are not treated equally:

| Alarm | Without exact permission | Why |
|---|---|---|
| Leave now | **Offered**, scheduled ~10 min earlier to absorb the delay window | Erring early is recoverable — the rider leaves a little sooner. Erring late means a missed bus |
| Change is coming | **Offered**, same early bias | Same reasoning |
| Get off at next stop | **Disabled**, with an explanation | A "get off now" arriving 20 minutes after the stop actively sends the rider to the wrong place |
| Journey complete | **Disabled** | A late "you've arrived" is pure noise |

The preference sheet greys out the disabled rows and shows a single line offering the fix:

> Precise timing is off — [turn it on] to get stop alerts

This is the honest position: give the rider what still works, withhold what would mislead them,
and say which is which. It also satisfies the general principle in
[07](./07-i18n-and-copy.md) §2 rule 2 — never promise certainty the platform cannot deliver.

### A2. Battery-optimisation exemption — do not request it

`REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` is a restricted Play permission with a narrow list of
eligible use cases; a transit companion is not among them. It must **not** be used as a
workaround for A1. Requesting it is both a policy violation and a hostile pattern.

### A3. Runtime notification permission — compliant

`POST_NOTIFICATIONS` (Android 13+) is added by the plugin and requested at a rider-initiated
moment ([05](./05-permissions-and-lifecycle.md) §2). The two-strike permanent denial is handled
by the `blocked` gate. No prompt at launch, no nagging, no re-request loop.

### A4. Notification channels — compliant

Two channels with distinct importance ([05](./05-permissions-and-lifecycle.md) §4). This is what
gives Android riders OS-level per-category control, which is the platform's expected opt-out
mechanism and also satisfies **I1** below on that platform.

### A5. Boot persistence — handled

`RECEIVE_BOOT_COMPLETED` is added automatically by the library, confirmed in Expo's docs.
Without it every armed alarm would die silently on reboot.

### A6. Notification icon — compliant

White-on-transparent alpha silhouette, per Material guidance. Shipped and verified
([10](./10-rollout-and-risks.md) §3).

### A7. Data Safety — no change

Nothing is collected or transmitted by this feature. Analytics events are consent-gated and
carry no itinerary detail ([08](./08-analytics.md) §3).

---

## Part B — Apple / App Store

### I1. Guideline 4.5.4

> *"Push Notifications must not be required for the app to function, and should not be used to
> send sensitive personal or confidential information. Push Notifications should not be used for
> promotions or direct marketing purposes unless customers have explicitly opted in… and you
> provide a method in your app for a user to opt out."*

Strictly this governs APNs push, and ours are local. The plan complies anyway — there is no
upside to sitting on the wrong side of it, and the HIG expects the same behaviour regardless.

| Clause | Status |
|---|---|
| Not required to function | ✅ Every feature works without notifications. They are additive, opt-in, and per-journey |
| No sensitive information | ✅ Stop names and route numbers only. No account, payment, or health data. iOS "hide previews" is honoured by the system automatically |
| **No promotions or marketing** | ✅ **Enforced as a hard rule — see I1.1** |
| **In-app opt-out** | ⚠️ **Gap found — see I1.2** |

#### I1.1 Notifications never carry an upsell — a hard rule

**No notification produced by this feature may contain premium marketing, a paywall prompt, a
subscription reminder, or a "you're missing out" message.** Not in the title, not in the body,
not as a deep link that opens the paywall.

This is not only a 4.5.4 exposure. It would corrode the feature: a rider grants notification
permission for bus alerts, and the moment one arrives selling something, they revoke it — and
revocation is effectively permanent ([05](./05-permissions-and-lifecycle.md) §2.0). One
promotional notification costs the alarm channel for that rider forever.

The paywall belongs where it already is: in-app, on the bell tap, through `guardPremiumAction`
([06](./06-premium-gating.md)).

#### I1.2 Gap — service announcements had no opt-out

**Found during this sweep.** Journey alarms have an obvious opt-out: disarm the bell. Service
announcements are auto-scheduled from bootstrap and, on iOS, had **no in-app way to switch them
off** — only the OS-wide toggle, which kills bus alerts too. Android riders were fine via the
separate channel; iOS riders had all-or-nothing.

**Fix:** a `serviceAnnouncements: boolean` field on `NotificationPrefs`
([03](./03-preferences-and-storage.md) §2), default `true`, surfaced as a switch in the settings
Notifications row:

> Service updates — Timetable changes and service notices  `[ on ]`

Free riders see and control it too; it is a free-tier feature, so the row must not be premium-gated.

### I2. Time-sensitive entitlement — narrow the claim

`com.apple.developer.usernotifications.time-sensitive` lets a notification break through Focus
modes and the scheduled summary. Apple grants it for notifications that genuinely *require
immediate attention*, and reviews the usage.

An earlier draft of [05](./05-permissions-and-lifecycle.md) §4A.2 marked **all journey alarms**
time-sensitive. That over-claims:

| Alarm | Level | Justification |
|---|---|---|
| Leave now | `timeSensitive` | Worthless if it arrives after the bus has gone |
| Change is coming | `timeSensitive` | A missed connection is the failure this feature exists to prevent |
| Get off at next stop | `timeSensitive` | Seconds matter; a summarised alert is useless |
| **Journey complete** | **`active`** | Nothing requires immediate attention on arrival. The rider is standing at their destination |
| Service announcements | `active` | Important, not urgent. A timetable change can wait for the summary |

Claiming the entitlement for a "you have arrived" message is exactly the kind of over-reach that
gets the whole entitlement questioned — and losing it would take `leaveNow` down with it. Narrow
the claim, keep the capability.

**App Review note** should state the use plainly: *"Time-sensitive notifications are used for
public-transport departure, connection, and alighting alerts, where a delayed or summarised
notification causes the user to miss their bus. Notifications are user-armed per journey and can
be turned off individually."*

### I3. Permission behaviour — compliant

Apple expects apps not to manipulate or pressure people into granting permission. The plan asks
**once**, at the highest-intent moment, after the rider has chosen what they want
([05](./05-permissions-and-lifecycle.md) §2.1); shows a soft inline line on refusal rather than a
re-prompt (§3.1); and offers the Settings route only when the rider asks to turn alerts on
(§3.2). No pre-permission dark patterns, no repeated prompting, no feature hostage-taking.

### I4. No background modes — compliant

`UIBackgroundModes` is deliberately not declared ([05](./05-permissions-and-lifecycle.md) §1.3).
Local notifications need none, and declaring unused background capability invites rejection under
2.5.4.

### I5. Privacy manifest — no change

Local scheduling touches none of the declared `NSPrivacyAccessedAPITypes` categories, and the
feature collects nothing.

---

## Part C — Changes this sweep forces

| # | Change | Where |
|---|---|---|
| 1 | Declare `SCHEDULE_EXACT_ALARM`; check `canScheduleExactAlarms()`; never let it throw | [05](./05-permissions-and-lifecycle.md) §1.3, §4B |
| 2 | Degradation rule — `alight` and `complete` disabled without exact alarms; `leaveNow`/`change` biased early | §A1.1 |
| 3 | Verify whether `expo-notifications` guards the `SecurityException` itself | Build unit 1 |
| 4 | `complete` and announcements drop to `active` interruption level | [05](./05-permissions-and-lifecycle.md) §4A.2 |
| 5 | Add `serviceAnnouncements` opt-out to prefs and the settings row | [03](./03-preferences-and-storage.md) §2, [02](./02-journey-alarms-ux.md) §4.4 |
| 6 | Hard rule: no upsell in any notification | §I1.1 |
| 7 | App Review note for the time-sensitive entitlement | [10](./10-rollout-and-risks.md) §4 |
| 8 | Never request `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` | §A2 |

## Sources

- [Schedule exact alarms are denied by default — Android Developers](https://developer.android.com/about/versions/14/changes/schedule-exact-alarms)
- [Schedule alarms — Android Developers](https://developer.android.com/develop/background-work/services/alarms)
- [Permissions and APIs that Access Sensitive Information — Play Console Help](https://support.google.com/googleplay/android-developer/answer/16558241)
- [App Review Guidelines — Apple Developer](https://developer.apple.com/app-store/review/guidelines/)
- [Expo Notifications SDK — permissions and Android configuration](https://docs.expo.dev/versions/latest/sdk/notifications)
