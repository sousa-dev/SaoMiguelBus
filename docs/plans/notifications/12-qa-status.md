---
title: "Device QA — implementation state"
parent: ./00-overview.md
---

# 12 — Device QA status

The [09 §6](./09-testing.md) checklist, annotated with what the code now does,
so the human running it knows what is expected to pass, what cannot be tested,
and what to try first.

**Nothing in this document has been run on a device.** It is the *state of the
implementation*, not a test result. Everything below needs a dev build:

```bash
npx expo prebuild          # required — the plugin, the entitlement and the
npx expo run:ios           # local module are all native config
npx expo run:android
```

---

## 0. Native builds — DONE, both platforms

Both native builds were run locally and **both succeed**. The section below is no
longer a risk; it is a record.

| | Result |
|---|---|
| `npx expo prebuild --platform android` | ✅ |
| `./gradlew :app:assembleDebug` | ✅ `app-debug.apk` produced |
| `npm run ios:prebuild` (prebuild + path fix + `pod install`) | ✅ |
| `cd ios && pod install` (re-resolve, see below) | ✅ |
| `xcodebuild -scheme SoMiguelHub -sdk iphonesimulator` | ✅ `SoMiguelHub.app` produced, 0 errors |

Verified in the produced artifacts, not just from the exit code:

- `-lExpoNotifications` is in the app's link line, and `libExpoNotifications.a` was
  built; `SchedulerModule.swift`, `PermissionsModule.swift` and
  `NotificationRecords.swift` all compiled
- the built `Info.plist` has **no** `UIBackgroundModes` (11 §I4)
- `SoMiguelHub.entitlements` carries `com.apple.developer.usernotifications.time-sensitive`

### Two failures were found and fixed

**1. Android — Kotlin compile error.** `ExactAlarmModule.kt` used a valueless
`return@Function` as an early exit. Expo types a `Function` body as returning
`Any?`, and Kotlin only permits a valueless `return@label` when the expected type
is `Unit`:

> `e: ExactAlarmModule.kt:64:9 Return type mismatch: expected 'Any?', actual 'Unit'.`

Rewritten as a positive `if (SDK_INT >= S) { … }` guard. It is the only error the
module produced.

**2. iOS — a stale `Podfile.lock`, exposed rather than caused by this work.**

```
error: lstat(.../node_modules/expo-auth-session/node_modules/expo-application/ios/PrivacyInfo.xcprivacy):
       No such file or directory (in target 'EXApplication-ExpoApplication_privacy')
```

The local (untracked) `ios/Podfile.lock` pinned `EXApplication` to a **nested**
copy of `expo-application` hoisted under `expo-auth-session`. Installing
`expo-notifications` made npm dedupe that nested copy away — the "removed 1
package" line in the install output — leaving `Podfile.lock` pointing at a
directory that no longer exists. `expo prebuild` did not re-run CocoaPods, so
nothing corrected it.

Fixed by re-resolving: `cd ios && pod install`, then re-applying
`scripts/fix-ios-xcode-paths.mjs` (pod install regenerates `Pods.xcodeproj` and
drops the patches that project needs for a path containing spaces).
`EXApplication` now resolves to `../node_modules/expo-application/ios`.

> Worth knowing rather than filing away: any dependency change can move a hoisted
> package and strand `Podfile.lock`. If an iOS build fails on a path under
> `node_modules/*/node_modules/`, this is it, and `pod install` is the fix.

**The local module is genuinely wired**, not merely present:

- `expo-modules-autolinking resolve -p android` lists it among 30 modules
- Gradle builds `:exact-alarm:compileDebugKotlin` as its own project
- `expo/android/build/generated/expo/src/main/java/expo/modules/ExpoModulesPackageList.kt`
  contains `expo.modules.exactalarm.ExactAlarmModule::class.java`

### Merged-manifest checks (09 §6) — all pass

| Check | Result |
|---|---|
| `SCHEDULE_EXACT_ALARM` present | ✅ |
| `USE_EXACT_ALARM` **absent** | ✅ |
| `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` **absent** | ✅ |
| `POST_NOTIFICATIONS` added by the library | ✅ |
| `RECEIVE_BOOT_COMPLETED` added by the library | ✅ |
| Nothing dropped by adding `android.permissions` | ✅ location, ads and biometric entries all survive |
| iOS `UIBackgroundModes` absent | ✅ |
| iOS time-sensitive entitlement present | ✅ |

---

## 0a. Two things the build surfaced that the plan did not predict

Neither blocks the build. Both are **store-submission decisions** and want a human
answer before you submit.

### (a) `expo-notifications` drags in 22 permissions nobody asked for

10 §4 says the review impact is "a new permission" (singular) and 11 §A7 says Data
Safety is unchanged. The built manifest disagrees. Beyond `POST_NOTIFICATIONS`
and `RECEIVE_BOOT_COMPLETED`, the library adds:

- `com.google.android.c2dm.permission.RECEIVE` and `WAKE_LOCK` — from
  `firebase-messaging`, which `expo-notifications` depends on unconditionally
- `READ_APP_BADGE` plus **~20 OEM launcher badge permissions** (Samsung, Huawei,
  Oppo, Sony, HTC, …) — from `me.leolin:ShortcutBadger`, an unconditional
  dependency of the badge module

This app **never sets a badge** — `setNotificationHandler` returns
`shouldSetBadge: false` precisely because an unclearable badge is a support
ticket — and it never registers for remote push. So all 22 are inert.

**They are still declared, and a reviewer sees the declaration.** If that is
unwanted, `android.blockedPermissions` in `app.json` strips them at merge time.
Not done here: blocking permissions a bundled library expects is a change with
its own (small) runtime risk, and it is a submission decision rather than an
implementation one.

### (b) iOS gains `aps-environment` — a push entitlement for an app with no push

`withNotificationsIOS.js` adds `aps-environment: development` to the
entitlements unconditionally. The generated
`ios/SoMiguelHub/SoMiguelHub.entitlements` now carries it.

Two consequences:

1. **It may be a provisioning prerequisite.** An App ID without the Push
   Notifications capability enabled cannot be issued a profile carrying this
   entitlement, so an archive or TestFlight build can fail where a simulator
   build succeeded. Enable Push Notifications on `com.sousadev.saomiguelhub`, or
   strip the entitlement.
2. **It declares a capability the app does not use** — exactly the shape of thing
   11 §I4 refuses `UIBackgroundModes` for. The same argument applies here.

Left in place deliberately: removing it needs a small config plugin, and whether
to keep the push door open is a product decision, not a build one.

---

## 0b. If the native module ever has to go

The feature degrades safely without `modules/exact-alarm` if it ever becomes a
maintenance burden:
`lib/notifications/exact-alarms.ts` uses `requireOptionalNativeModule`, so
deleting `modules/exact-alarm` leaves the app working with precise timing
assumed. What is then lost is the degradation rule in [11](./11-platform-compliance.md) §A1.1.

---

## 1. Cannot be tested — resolved during the build

| Item | Status |
|---|---|
| `SecurityException` crash when scheduling an exact alarm without permission | **Cannot occur.** `expo-notifications@56.0.24` guards it internally: `ExpoSchedulingDelegate.setupAlarm` tests `SDK_INT < S \|\| canScheduleExactAlarms()` and falls back to `setAndAllowWhileIdle`. The 09 §6 line "confirm the app does not crash when arming" is satisfied by construction; it is still worth one look on a fresh Android 14+ install |
| **iOS: a journey's alarms group under one `threadIdentifier`** | ❌ **N/A — not implementable in SDK 56.** `threadIdentifier` is absent from `NotificationContentInput`, and although the native record declares the field, `toUNMutableNotificationContent()` applies title, body, badge, data, `categoryIdentifier`, sound, attachments and `interruptionLevel` and **drops it**. Passing it would be silently ignored. Loss is cosmetic grouping only. **Strike this line from the checklist** |

---

## 2. Permission — the three gates

All implemented in `useNotifyBell` + `lib/notifications/scheduler.ts`.

- [ ] First arm shows the OS prompt *after* the preference sheet, not before
- [ ] `askable`: denying shows the soft inline line only — no sheet, no Settings push
- [ ] `askable`: tapping the bell again *does* re-show the OS dialog
- [ ] `blocked`: tapping the bell shows the *Turn on notifications* sheet and **never** calls `requestPermissionsAsync()`
- [ ] `blocked` is reached correctly: one denial on iOS; **two** on Android 13+
- [ ] `Open Settings` lands on the app's own settings page on both platforms
- [ ] Android 13+: `POST_NOTIFICATIONS` is requested, not silently assumed
- [ ] iOS provisional authorisation counts as granted, not denied

> The gate branches **before** requesting, so the blocked path cannot reach
> `requestPermissionsAsync()`. That is the invisible dead tap worth confirming by hand.

## 3. Return from Settings

`lib/notifications/pending-intent.ts` + `useNotificationPermissionResume`.

- [ ] Grant in Settings → return → **the arm completes by itself** and the bell fills
- [ ] Grant in Settings → return → the confirmation line appears
- [ ] Return **without** granting → intent discarded silently, sheet is *not* re-shown
- [ ] Same resume works for the free announcement row
- [ ] App killed by the OS while in Settings → returning is clean, bell simply empty

> The announcement row resumes via the foreground sweep in
> `useServiceAnnouncements` rather than through a pending intent — same
> user-visible outcome, one less thing to hold.

## 4. Settings row

- [ ] Status line matches the live OS gate in all three states
- [ ] Status updates after changing permission in system settings and returning
- [ ] From `blocked`, the row routes to Settings and the resume still applies
- [ ] **A free rider can reach and toggle *Service updates* without meeting a paywall** (guideline 4.5.4)
- [ ] A free rider sees the four alarm types listed before the paywall opens

## 5. Revocation

- [ ] Revoking permission in system settings, then foregrounding, shows the inline warning on armed rows
- [ ] Re-granting restores delivery of still-pending alarms (they are never cancelled)

## 6. Android exact alarms — test on Android 14+

The highest-risk area. A fresh install on Android 14+ starts **denied**.

- [ ] Fresh install on Android 14+: arming does not crash
- [ ] Ticking "Get off at next stop" while denied shows the precise-timing sheet
- [ ] `Not now` still arms `leaveNow` and `change`, with *around* copy
- [ ] `alight` and `complete` are visibly disabled with the explanatory line
- [ ] Granting via `ACTION_REQUEST_SCHEDULE_EXACT_ALARM` → return → all four types available
- [ ] Granting in system settings **outside** the flow is picked up while the sheet is open
- [ ] With permission granted, an alarm fires within ~1 minute of its scheduled time
- [ ] Without it, measure the actual Doze delay and confirm the 10-minute early bias absorbs it
- [ ] Android 11 and below: no prompt appears at all; the gate reports granted

## 7. Store compliance

- [ ] No notification anywhere contains an upsell or opens the paywall — **also enforced in CI** by `__tests__/lib/notification-locales.test.ts`
- [ ] Service-updates switch is visible and functional for a free rider
- [ ] Turning it off stops announcements while journey alarms keep working
- [ ] Built manifest contains `SCHEDULE_EXACT_ALARM` and **not** `USE_EXACT_ALARM`
- [ ] Built manifest does **not** contain `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`
- [ ] Built `Info.plist` has **no** `UIBackgroundModes` from this feature
- [ ] `complete` and announcements are `active`, not `timeSensitive` — verify against a Focus mode
- [ ] **Adding `android.permissions` to `app.json` did not drop permissions other modules need** — diff the built manifest against the previous release. `expo-location` and the ads SDK both contribute entries, and this is the first time the app has declared an explicit list

## 8. Delivery

- [ ] Alarm fires with the app backgrounded
- [ ] Alarm fires with the app **force-quit** — expected to work; confirm rather than assume
- [ ] Alarm fires with the device locked and is legible on the lock screen
- [ ] Foreground delivery shows a banner
- [ ] Android: journey alarms are `HIGH` (heads-up), announcements `DEFAULT` (quiet)
- [x] **Android: the notification icon is a white silhouette, not a grey square** —
      verified statically: 96×96 RGBA, all 3201 visible pixels pure white (≥254),
      212 distinct alpha levels. Android masks this asset, so any colour in it
      would ship as the classic grey square; there is none. Still worth one
      glance on a device to confirm the plugin generated the densities correctly
- [ ] **iOS with a Focus mode active**: a journey alarm breaks through, an announcement does not
- [ ] iOS: the bus glyph is recognisable at 20pt

> **Channel importance is a first-run decision.** Verify `HIGH` vs `DEFAULT` on a
> **clean install** — once created, a channel's importance cannot be changed by
> an update, only by shipping a new channel id.

## 9. Cancellation

- [ ] Disarming cancels pending alarms — verify nothing fires afterwards
- [ ] Stopping the track cancels them
- [ ] Letting a track expire (via `pruneTracking`) cancels them
- [ ] Switching network dataset cancels them
- [ ] "Delete my data" cancels them **and** wipes preferences
- [ ] Entitlement lapse cancels them — including a lapse that happened while the app was closed

## 10. Lifecycle

- [ ] Armed alarms survive an app update (reconciliation)
- [ ] Uninstall/reinstall fires no stale announcement
- [ ] Cold-start tap on a notification routes correctly
- [ ] Background tap routes correctly
- [ ] Locale switch after arming: pending alarms keep the old wording, new arms use the new locale

> **Reconciliation must not eat the announcement.** It exempts
> `data.kind === 'announcement'` from orphan-sweeping, because an announcement is
> unclaimed by any track *by design*. Worth confirming directly: arm the
> announcement, relaunch twice, check it is still pending.

## 11. Announcement, on a simulated cutover

Use **Settings → Simulate cutover**, not the device clock — the phase is server
state and the client deliberately ignores the clock.

- [ ] With the real armed cutover (1 Sept 2026), the announcement schedules
- [ ] With `phase: 'settled'`, nothing schedules
- [ ] Firing it once, then relaunching several times, produces exactly one notification
- [ ] Tapping it lands on transit with `ScheduleChangeBanner` visible

> `simulatePhase()` backdates `cutoverAt` to 24h ago, so simulating `live`
> produces a fire time in the past and correctly schedules **nothing**. The
> positive case is tested against the real config, which is armed for a future
> date. This is expected behaviour, not a bug.

---

## 11a. Analytics volume

The announcement sweep runs on launch **and every foreground**, so two of its
events are guarded to fire at most once per app run
(`lib/notifications/analytics.ts`). Without that guard, a rider without
permission emits one `announcement_skipped` per foreground for as long as a
cutover is armed — which both corrupts the reach number in 10 §2 and evicts real
events, since the offline queue is bounded by `MAX_QUEUE_SIZE` and trims oldest.

- [ ] Foreground the app five times with an announcement armed and permission
      denied. Exactly **one** `announcement_skipped` and **one**
      `announcement_prompt_shown` should be queued, not five of each
- [ ] Arming a journey emits exactly one `notifications.arm`

## 11b. Test notifications (added after the plan)

Not in the original plan — requested because a rider (not just a tester) benefits
from seeing what they are signing up for.

**Two surfaces:**

| Where | Sends | Gated? |
|---|---|---|
| Settings → *Send a test notification* | the service-announcement copy, on the announcements channel | **No.** "Do notifications work on this phone" is not a premium question, and the free channel is the only thing a non-subscriber can meaningfully verify |
| Preference sheet → *Test* on each alarm row | that type's real copy, on the journey-alarms channel | Inherited — the sheet is already behind the premium gate |

It goes through the same `alarmContent`, channel and interruption level as a real
alarm, because a preview that took a shortcut would answer a different question.
Two deliberate differences:

- **The title carries a translated `Test ·` marker.** A rider who taps Test,
  pockets the phone and reads *"Time to leave — your 25 leaves Ponta Delgada in
  10 min"* five seconds later could otherwise go and stand at a bus stop.
- **A `change` test never uses the tight-change wording.** That variant exists
  for the one genuinely urgent moment; a preview firing it is crying wolf.

It borrows the rider's own route and stops when they have a journey tracked or
pinned, and falls back to a **translated generic** — never a hardcoded São Miguel
place name, which would be wrong on a white-labelled second island.

- [ ] Settings test arrives in ~5 seconds, on a locked screen, looking right
- [ ] It works for a **free** rider without hitting the paywall
- [ ] Each of the four rows in the sheet sends that type's copy
- [ ] The lead-time chips change the number in the test (change it to 30, test
      "Time to leave", confirm it says 30)
- [ ] Every test title is visibly marked as a test
- [ ] Tapping Test while `blocked` opens the *Turn on notifications* sheet rather
      than silently doing nothing
- [ ] Tapping Test while `askable` shows the OS prompt, then sends on grant
- [ ] Android: the alarm-type tests are heads-up; the settings test is quiet
      (they are on different channels)
- [ ] Backgrounding and relaunching within the 5 seconds does **not** cancel it —
      reconciliation exempts `kind: 'test'` alongside announcements

## 12. Open item for confirmation

[02](./02-journey-alarms-ux.md) §6 was flagged in the plan as the one decision
taken without an explicit answer, and is implemented as written:

> Tracks started automatically by `useAutoTrackPinnedRoutes` get **no**
> notifications. A switch in the notification defaults — *Also notify me for my
> pinned routes* — opts in, and it defaults **off**.

`armTrack` returns early for any track carrying `auto` unless
`prefs.notifyPinnedRoutes` is set. If it should default on, or the switch should
not exist, that is a one-line change in `defaultNotificationPrefs()` and a
deletion in the sheet — nothing downstream depends on it.

---

## 13. Apple compliance audit — verified against the built app

Checked against the live App Store Review Guidelines, not against the plan, and
then against the shipped `ios/` output rather than intent.

### Compliant

| Rule | Requirement (verbatim, abridged) | Evidence in this app |
|---|---|---|
| **4.5.4** | "must not be required for the app to function" | Every module works without notifications. Nothing outside the arming path reads `permissionGate()` — grep-verified |
| **4.5.4** | "should not be used to send sensitive personal or confidential information" | Content is stop names and route numbers. The `data` payload carries only `route`, `kind`, `type`, an opaque local `trackId`, and a timestamp. No account, payment, location or health data |
| **4.5.4** | "should not be used for promotions or direct marketing" | Hard rule, and **CI-enforced**: `notification-locales.test.ts` fails if any lock-screen string in any of the 8 locales matches a marketing pattern. No `data.route` can reach the paywall — every kind resolves to `/(tabs)/transit` |
| **4.5.4** | "provide a method in your app for a user to opt out" | Two: per-journey (disarm the bell) and the **ungated** *Service updates* switch in Settings, deliberately outside the premium row so a free rider reaches it without a paywall |
| **5.1.2(i)** | "may not require users to enable system functionalities … in order to access functionality" | Denying permission disables **only** the alerts themselves. Premium's other entitlements — ad-free, tracking widget, pinned routes — are untouched |
| **5.1.1(ii)** | "easily accessible and understandable way to withdraw consent" | Settings row reports the live OS gate in all three states and routes to Settings when blocked |
| **5.1.1(ii)** | "purpose strings clearly describe your use" | N/A — iOS local notifications take no usage-description string, and none is declared |
| **2.5.4** | background services only for intended purposes | `UIBackgroundModes` **absent** from the built `Info.plist` — verified in the compiled `.app`. Local notifications are named in 2.5.4 as a permitted use |
| Privacy manifest | required-reason APIs | Unchanged: `UserDefaults`, `FileTimestamp`, `SystemBootTime`, `DiskSpace`. Local scheduling adds no required-reason API |
| Anti-pattern | no fake "pre-permission" dialog | The preference sheet is a real configuration UI with switches, not an imitation of the system alert. The OS prompt follows it |
| Anti-pattern | no re-prompt loop | `ensurePermission` requests **only** while `askable`; once blocked it never calls request again |

### Time Sensitive — no pre-approval needed

`com.apple.developer.usernotifications.time-sensitive` is **self-service**; only
*critical alerts* require an approved entitlement from Apple. It is still
reviewed by hand, and the claim here is deliberately narrow — `leaveNow`,
`change` and `alight` only. `complete` and service announcements are `active`,
because a "you have arrived" message that breaks through Focus is exactly the
over-reach that gets the whole entitlement questioned (11 §I2).

**App Review note — paste this into the submission:**

> Time-sensitive notifications are used for public-transport departure,
> connection, and alighting alerts, where a delayed or summarised notification
> causes the user to miss their bus. Notifications are user-armed per journey and
> can be turned off individually.

### Two things to decide before submitting

**1. `aps-environment` is declared but the app never uses remote push.**
The `expo-notifications` config plugin adds it unconditionally, so
`SoMiguelHub.entitlements` now carries `aps-environment: development`. Not a
guideline breach, but it declares a Push Notifications capability this app does
not use — the same argument 11 §I4 uses to refuse `UIBackgroundModes`. It is
also a **provisioning prerequisite**: an App ID without the Push Notifications
capability cannot be issued a profile carrying it, so an archive or TestFlight
build can fail where a simulator build succeeded. Either enable Push on
`com.sousadev.saomiguelhub`, or strip the entitlement with a small config plugin.

**2. Sequencing: a rider can buy premium and only then be asked for permission.**
The flow is bell → paywall → preference sheet → OS prompt, so someone can
purchase and then deny. Not a 5.1.2(i) breach — premium is a bundle and its
other entitlements still work — but it is a refund-and-complaint path. Asking
before the paywall would spend the one permission prompt at a much weaker moment,
so it is left as is; worth a product decision rather than a silent default.
