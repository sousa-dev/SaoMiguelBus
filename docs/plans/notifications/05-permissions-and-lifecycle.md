---
title: "Permissions, channels, and lifecycle"
parent: ./00-overview.md
---

# 05 — Permissions and lifecycle

Everything between "the rider tapped a bell" and "a notification appeared." Satisfies
**R17, R18**, and the reconciliation half of **R13**.

---

## 1. Dependency and native configuration

### 1.1 Package

```
npx expo install expo-notifications
```

Expo SDK 56. This project **prebuilds** (`ios/` and `android/` are committed, `npm run
ios:prebuild` exists), so the Expo Go restrictions on notifications do not apply — local
notifications work in a dev build and in production.

### 1.2 `app.json`

Add to `expo.plugins`:

```json
[
  "expo-notifications",
  {
    "icon": "./assets/images/notification-icon.png",
    "color": "#a9d566",
    "defaultChannel": "journey-alarms"
  }
]
```

`#a9d566` is the app's existing brand green — already the splash and adaptive-icon background.
The notification icon must be a **white-on-transparent silhouette**; Android renders it as a
mask and any colour in the source is discarded, producing the grey square that is the usual
symptom of shipping the app icon here by mistake.

`app.json` `version` gets its patch segment bumped, per the standing project rule.

### 1.3 Everything that must be declared

| Platform | Declaration | Who adds it |
|---|---|---|
| Android 13+ | `android.permission.POST_NOTIFICATIONS` in the manifest | **The plugin**, automatically. Do not hand-add it to `app.json` `android.permissions` — a duplicate entry is at best noise |
| Android | `RECEIVE_BOOT_COMPLETED` — re-registers pending alarms after a reboot | **The plugin**, automatically. Without it every armed alarm dies on restart, silently |
| **Android 12+** | **`android.permission.SCHEDULE_EXACT_ALARM`** | **You**, in `app.json` `android.permissions`. **Not** added by the plugin — Expo's docs are explicit that it must be added manually. Without it alarms are delivered **10–30 minutes late**. See §4B and [11](./11-platform-compliance.md) §A1 |
| iOS | Alert / badge / sound authorisation | Runtime only. **No `infoPlist` entry** — unlike location or camera, local notifications need no usage-description string |
| iOS | `com.apple.developer.usernotifications.time-sensitive` | **You**, in `app.json` — see below and §4A.2 |
| iOS | `UIBackgroundModes` | **Nobody.** These are *local* notifications. Declaring background capability the app does not use invites rejection |

The two hand-written declarations:

```json
"ios": {
  "entitlements": {
    "com.apple.developer.usernotifications.time-sensitive": true
  }
},
"android": {
  "permissions": ["android.permission.SCHEDULE_EXACT_ALARM"]
}
```

`app.json` currently has **no** `android.permissions` array; this creates it. Adding the key
means Expo stops inferring the permission list, so verify the built manifest still carries
everything the other modules need — `expo-location` and the ads SDK both contribute entries.

**No new privacy-manifest entry is required.** Local scheduling touches none of the
`NSPrivacyAccessedAPITypes` categories already declared in `app.json`, and this feature collects
and transmits nothing. Play Data Safety is likewise unchanged.

> **All of this is build-time.** `expo-notifications` is a config plugin and the entitlement is
> native config, so both require `npx expo prebuild` plus a native rebuild. Neither appears on a
> JS reload, and neither can be shipped as an OTA update.

---

## 2. When permission is requested (R17)

**Never at launch. Never on a screen that has not explained why.** Two triggers, both
rider-initiated.

### 2.0 Three states, not two — the rule everything else depends on

`getPermissionsAsync()` returns `{ status, granted, canAskAgain, ios?, android? }`. The app must
branch on **three** outcomes, not on granted/denied:

| Gate | Condition | What happens on tap |
|---|---|---|
| `granted` | `granted === true`, or `ios.status === PROVISIONAL` | Proceed |
| `askable` | `status === 'undetermined'`, **or** denied with `canAskAgain === true` | Call `requestPermissionsAsync()` — the OS dialog appears |
| `blocked` | denied with `canAskAgain === false` | **Do not call request.** Go straight to the settings route (§3.2) |

**Calling `requestPermissionsAsync()` while `blocked` is a dead tap.** The OS shows nothing and
the promise resolves `denied` immediately — the rider presses a button and the app appears to
do nothing at all, with no dialog and no explanation. This is precisely the bug commit
`b764b2a` already fixed once in this codebase for the paywall: *"a paywall that cannot be shown
must not be a dead tap."* The same discipline applies here.

You reach `blocked` easily and permanently:

- **iOS** — one denial. `requestAuthorization` never presents twice; from then on the only route
  is Settings.
- **Android 13+** — `POST_NOTIFICATIONS` is permanently denied after the second refusal.

The `granted` check must use Expo's documented form, not `granted` alone, or a
provisionally-authorised iOS rider is wrongly treated as denied:

```ts
const settings = await Notifications.getPermissionsAsync();
const allowed =
  settings.granted ||
  settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
```

`scheduler.ts` exposes this as one function; nothing else in the app reads permission directly:

```ts
type PermissionGate = 'granted' | 'askable' | 'blocked';
export function permissionGate(): Promise<PermissionGate>;
export function ensurePermission(): Promise<PermissionGate>;  // asks if askable
```

### 2.1 Journey alarms — the bell

```
tap bell
  → guardPremiumAction (paywall for free riders — see 06)
  → premium confirmed
  → preference sheet opens, rider chooses, taps "Notify me"
  → permissionGate()
      ├─ granted  → arm, fill the bell
      ├─ askable  → requestPermissionsAsync()
      │              ├─ granted → arm, fill the bell
      │              └─ denied  → soft nudge (§3.1), bell stays empty
      └─ blocked  → settings route (§3.2), bell stays empty
```

Requesting *after* the sheet, not before it, is deliberate: the OS dialog then lands on a rider
who has just told the app exactly which alerts they want. That is the highest-intent moment
available — and since a denial is effectively permanent, spending the one prompt at the
strongest moment is the whole game.

### 2.2 Service announcements — never a cold prompt

Covered in [01](./01-service-announcements.md) §4.1. The announcement channel schedules only
if permission is *already* granted; otherwise it renders an in-app row offering it, dismissible
and remembered per announcement id.

A free rider who has never armed a journey alarm therefore meets the OS prompt only after
tapping **Turn on** on a row that says what the notification will be about.

---

## 3. Denial and revocation

Permission is authoritative in the OS and can change outside the app at any time. It is
**never cached** ([03](./03-preferences-and-storage.md) §5); it is read with
`getPermissionsAsync()` at every decision point.

### 3.1 Denied at the dialog, but still askable

The rider saw the OS prompt and said no. Do **not** immediately re-prompt or push them to
Settings — they just answered the question.

A quiet inline line on the card, no sheet, no modal:

> Alerts are off. You can turn them on any time.

The bell stays empty. Next time they tap it, the flow runs again from §2.1 — and because the
gate is still `askable`, the OS dialog can appear again.

### 3.2 Blocked — the settings route

This is the case the rider means by *"I rejected it before and now I want to turn it on."* The
OS will never prompt again, so the app's job is to say so honestly and hand them to the one
place that can change it.

A `Sheet` — shown **only** when the gate is `blocked`:

> **Turn on notifications**
> You previously turned notifications off for São Miguel Hub, so we can't ask again from here.
> Open Settings to turn them back on, and we'll set up your alerts when you come back.
>
> [Open Settings] [Not now]

Three things this copy is doing deliberately:

1. **It explains why there is no dialog.** Without that, the rider reasonably expects a prompt
   and reads its absence as a broken button.
2. **It does not blame or nag.** One sheet, on demand, never volunteered.
3. **It promises the resume in §3.3**, so the trip to Settings does not feel like a dead end.

*Open Settings* calls `Linking.openSettings()`, which lands on the app's own settings page on
both platforms — iOS on the app page with the Notifications row, Android on App info, where
Notifications is one tap away. `Linking.openSettings()` is used rather than a hand-built
`app-settings:` URL, which is iOS-only and fragile.

The bell stays empty throughout. Arming did not happen and must never look as if it did.

### 3.3 Coming back from Settings — finish what they started

**Without this the feature reads as broken**, and it is the step most often skipped: the rider
taps *Open Settings*, grants permission, returns to the app — and finds the bell still empty,
with no indication anything happened. They then have to remember what they were doing and tap
through the whole flow again.

So the intent survives the trip:

1. Before opening Settings, `scheduler.ts` records a **pending intent** — which track was being
   armed and with which preferences — held in memory only. It is a resumption hint, not state
   worth persisting; if the OS kills the app while the rider is in Settings, the intent is gone
   and they simply tap the bell again.
2. On `AppState` → `active`, if a pending intent exists, re-read the gate.
3. `granted` → complete the arm, fill the bell, and confirm:
   > Notifications on — we'll alert you about this journey
4. Still `blocked` → discard the intent silently. They looked and chose not to. Re-showing the
   sheet would be nagging.

The same resume covers the free announcement row in [01](./01-service-announcements.md) §4.1:
grant on return, and the pending announcement is scheduled immediately rather than waiting for
the next launch.

### 3.4 Revoked after arming

A rider can arm alarms and then disable notifications in system settings. The OS keeps the
scheduled notifications and simply does not display them; the app has no callback.

On foreground, `scheduler.ts` checks permission. If it has been revoked while tracks are armed,
`ActiveTrackingSection` shows an inline warning on the affected rows:

> ⚠️ Alerts are off for this app — [turn them back on]

The alarms are **not cancelled**. Re-granting permission restores delivery for anything still
pending, and cancelling would throw away the rider's setup over a toggle they may flip back
in ten seconds.

---

## 4. Android channels

Registered at app start, before any scheduling, in `channels.ts`:

| Channel id | Name | Importance | Used by |
|---|---|---|---|
| `journey-alarms` | Bus alerts | `HIGH` | Every journey alarm |
| `service-announcements` | Service updates | `DEFAULT` | Announcements |

`HIGH` for journey alarms is the point of the feature — a heads-up notification the rider sees
without unlocking. `DEFAULT` for announcements, which are informational and must not buzz at
07:00 like an alarm.

Two channels rather than one so a rider can silence announcements while keeping bus alerts, in
Android's own settings, without the app needing a preference for it.

Channels are immutable after creation: importance is a **first-run decision**, and changing it
later requires a new channel id. Getting this wrong is not fixable in a patch release.

---

## 4A. The iOS equivalents

iOS has no channels and no notification-icon asset. Three things stand in for them.

### 4A.1 The icon is the app icon — nothing to build

iOS renders notifications with the **app icon**, taken from the generated `AppIcon` set (source:
`assets/images/icon.png`, 1024×1024) at the 20pt notification size — 40px @2x, 60px @3x. It is
shown **in full colour, unmasked and untinted**; the alpha-silhouette rules that govern
`notification-icon.png` are Android-only, as are the plugin's `icon` and `color` fields.

Checked at 40×40: the central bus glyph of the hub mark still reads, with the four satellite
icons softening to texture. Acceptable, and in any case it is the same asset already on the home
screen — a notification-specific iOS icon is not a thing that exists.

### 4A.2 Interruption level — use `timeSensitive` for journey alarms

This is the iOS lever that matters most for this feature, and it is the counterpart to Android's
`HIGH` channel importance.

| Level | Behaviour | Used by |
|---|---|---|
| `passive` | Added to the list silently; no screen wake | — |
| `active` | Default: wakes the screen, plays sound | **Journey complete**, **service announcements** |
| `timeSensitive` | Breaks through **Focus modes** and the **scheduled notification summary** | **Leave now**, **change**, **alight** |
| `critical` | Bypasses the mute switch. Requires a special Apple entitlement | Never — not justifiable here |

"Time to leave" and "get off at the next stop" are the textbook case for `timeSensitive`: a
notification that is worthless if it arrives an hour late in a summary. Without it, a rider with
Focus on — commuting, working, driving — silently gets nothing, which is precisely the rider
this feature exists for.

**`complete` is deliberately `active`, not `timeSensitive`.** Nothing requires immediate
attention on arrival — the rider is standing at their destination. Apple reviews this entitlement
by hand, and claiming Focus-breaking privilege for a "you have arrived" message is the kind of
over-reach that gets the whole entitlement questioned. Losing it would take `leaveNow` down with
it. Narrow the claim, keep the capability ([11](./11-platform-compliance.md) §I2).

Set per notification via `content.interruptionLevel`. It requires the
`com.apple.developer.usernotifications.time-sensitive` entitlement, declared in `app.json` under
`ios.entitlements`, and Apple expects the usage to be genuine — transit departure alerts are
squarely within their stated intent, but the App Review note should say so plainly.

Announcements stay `active`: a timetable change is important, not urgent, and burning
Focus-breaking privilege on it is what gets the entitlement questioned.

### 4A.3 Thread identifier — group a journey's alarms

Set `content.threadIdentifier` to the track id so a journey's three-to-five alarms collapse into
one group in Notification Centre rather than sprawling as unrelated rows. Android gets the
equivalent for free from the channel.

---

## 4B. Android exact alarms — a second permission

Full analysis in [11](./11-platform-compliance.md) §A1. The operational summary:

**Without `SCHEDULE_EXACT_ALARM`, Android may deliver an alarm 10–30 minutes late.** For "time to
leave" that is worse than sending nothing — the rider trusted it, didn't check the app, and
missed the bus.

### 4B.1 A third gate

Exact-alarm permission is separate from notification permission and has its own three states,
mirroring §2.0 so the UI has one mental model:

```ts
type ExactAlarmGate = 'granted' | 'askable' | 'unsupported';
```

- `granted` — `canScheduleExactAlarms()` is true, or the device predates Android 12
- `askable` — denied; recoverable via `Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM`
- `unsupported` — iOS, where the concept does not exist and the gate is always `granted`

**Android 14+ denies it by default** for newly-installed apps targeting API 33+, so the
ungranted path is the *common* case on new installs, not an edge case.

### 4B.2 It throws, it does not degrade

`setExact()`, `setExactAndAllowWhileIdle()` and `setAlarmClock()` raise a **`SecurityException`**
when the permission is absent. That is a crash, not a late notification.

> **Confirm during build unit 1** whether `expo-notifications` checks `canScheduleExactAlarms()`
> internally and falls back, or lets the exception propagate. Its documentation does not say, and
> the equivalent Flutter library has a known crash in exactly this scenario. **Do not assume it
> is handled** — write the guard, and remove it only after proving the library already has one.

### 4B.3 Degradation, per alarm type

Not every alarm degrades equally, so they are not treated equally
([11](./11-platform-compliance.md) §A1.1):

| Alarm | Without exact permission |
|---|---|
| Leave now | Offered, scheduled ~10 min earlier to absorb the delay window |
| Change is coming | Offered, same early bias |
| Get off at next stop | **Disabled** — a "get off now" arriving 20 minutes late sends the rider to the wrong place |
| Journey complete | **Disabled** — a late "you've arrived" is pure noise |

Erring early is recoverable; erring late is not. That asymmetry is the whole rule.

### 4B.4 When to ask

**Not** alongside the notification prompt. Two system permission requests back to back, for one
tap, reads as an app demanding things.

The exact-alarm prompt appears only when the rider enables an alarm type that *requires* it — the
first time they tick "Get off at next stop" — and the sheet says what it buys:

> **Turn on precise timing**
> Android needs permission to alert you at an exact minute. Without it we can only warn you
> roughly, so stop alerts stay off.
> [Open Settings] [Not now]

*Not now* is a real option: `leaveNow` and `change` still work. The same pending-intent resume as
§3.3 applies on return, and
`AlarmManager.ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED` catches a grant made outside
the flow.

---

## 5. Lifecycle integration

### 5.1 Where the hooks mount

`useServiceAnnouncements()` mounts in the app shell beside `useAutoTrackPinnedRoutes()`, which
already establishes the launch-and-foreground cadence and the `MIN_SWEEP_INTERVAL_MS` floor
that stops rapid app-switching from re-running work.

`scheduler.reconcile()` ([04](./04-scheduling-engine.md) §6.2) runs once per launch, after the
profile store has rehydrated — the persisted tracks are its input, and running before
rehydration would see an empty store and cancel every pending notification as an orphan.

### 5.2 `pruneTracking` gains cancellation

`useBusTracking` calls `pruneTracking(Date.now(), dataset)` on mount and every 30 seconds. It
already drops expired tracks and tracks belonging to the other dataset. It must now cancel
their notification ids as it does so.

This is the single most important integration point. Without it:

- A track expiring while the app is closed leaves alarms scheduled for a journey the app has
  forgotten.
- Switching network (legacy ↔ azoresbus) drops the tracks but leaves alarms that would fire
  with stop names from a network the rider is no longer looking at.

Because `pruneTracking` is a store action and cancellation is async, the store action collects
the ids to cancel and hands them to a fire-and-forget call in the scheduler. The store stays
synchronous; the OS call does not block the tick.

### 5.3 Force-quit does not stop delivery

Worth stating because the opposite is widely assumed, and an earlier draft of this plan got it
wrong.

A **scheduled local** notification is handed to the OS at arm time — `UNUserNotificationCenter`
on iOS, `AlarmManager`/`NotificationManager` on Android — and the system delivers it whether or
not the app is running. Force-quitting on iOS does **not** suppress it.

What force-quit *does* stop is **background execution**: silent pushes, background fetch,
background location. This feature uses none of them, which is a direct consequence of KTD1
(local-only, everything computed at arm time). The design is force-quit-proof by construction
rather than by luck.

The real delivery risks are elsewhere, and each has its own handling: permission denied (§2),
permission revoked after arming (§3.2), and iOS Focus modes (§4A.2).

### 5.4 The 30-second tick does not reschedule

`useBusTracking`'s interval refreshes *countdowns*. It must not re-arm, re-plan, or touch the
OS beyond the cancellation above. Alarms are scheduled once, at arm time, and changed only by
an explicit rider action or by reconciliation on launch.

---

## 6. Handling a tap

`setNotificationHandler` is configured once at app start so notifications display while the app
is foregrounded — a rider watching the tracking widget should still see "get off at the next
stop" surface.

```ts
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
```

`shouldSetBadge: false` — the app has no badge semantics, and an unclearable badge count is a
support ticket.

`addNotificationResponseReceivedListener` routes on `response.notification.request.content.data.route`:

| Notification | Lands on |
|---|---|
| Journey alarm | `/(tabs)/transit` — `ActiveTrackingSection` is at the top, showing the live journey |
| Service announcement | `/(tabs)/transit` — `ScheduleChangeBanner` carries the full explanation |

Both currently route to the same screen. The `route` field is carried in `data` anyway so that
a future deep link to a specific tracked journey needs no change to the notification payload,
only to the listener.

**Cold-start taps must work.** A tap that launches the app from terminated delivers through
`getLastNotificationResponseAsync()`, not the listener. Both paths are handled, and the
navigation is deferred until the router is mounted — routing during the splash silently drops.
