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

### 1.3 Permissions the platforms add

| Platform | What appears | Action needed |
|---|---|---|
| Android 13+ | `POST_NOTIFICATIONS` runtime permission | None — the plugin adds the manifest entry; the app requests it at the moment in §2 |
| iOS | Alert/sound/badge authorisation | None — no `UIBackgroundModes`, because these are *local* notifications. Nothing is added to `infoPlist` |

**No new privacy-manifest entry is required.** Local scheduling accesses none of the
`NSPrivacyAccessedAPITypes` categories already declared in `app.json`, and this feature
collects nothing.

---

## 2. When permission is requested (R17)

**Never at launch. Never on a screen that has not explained why.** Two triggers, both
rider-initiated:

### 2.1 Journey alarms — the bell

```
tap bell
  → guardPremiumAction (paywall for free riders — see 06)
  → premium confirmed
  → preference sheet opens, rider chooses, taps "Notify me"
  → NOW request OS permission
  → granted   → arm, fill the bell
  → denied    → settings nudge (§3), bell stays empty
```

Requesting *after* the sheet, not before it, is deliberate: the OS dialog then lands on a rider
who has just told the app exactly which alerts they want. That is the highest-intent moment
available, and OS permission is effectively one-shot on both platforms — a denial is close to
permanent, recoverable only through system settings.

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

### 3.1 The settings nudge

A `Sheet` shown when arming is attempted without permission:

> **Notifications are turned off**
> São Miguel Hub can't send you bus alerts until notifications are allowed for the app.
> [Open settings] [Not now]

*Open settings* calls `Linking.openSettings()`. The bell stays empty — arming did not happen
and must not look as if it did.

### 3.2 Revoked after arming

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

### 5.3 The 30-second tick does not reschedule

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
