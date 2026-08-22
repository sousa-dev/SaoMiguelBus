# `exact-alarm` — a local Expo module

Exposes the three Android exact-alarm APIs that `expo-notifications` does not,
and that the notification feature cannot implement its safety rules without.

## Why this exists

`expo-notifications@56` has **no exact-alarm surface in JavaScript**: no
`canScheduleExactAlarms()`, no `ACTION_REQUEST_SCHEDULE_EXACT_ALARM`, no
`ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED`.

Its Android delegate does check the permission internally
(`ExpoSchedulingDelegate.setupAlarm` → `SDK_INT < S || canScheduleExactAlarms()`)
and falls back to `AlarmManagerCompat.setAndAllowWhileIdle`. So **nothing
crashes** — the `SecurityException` the plan feared cannot reach us.

What it does instead is degrade **silently**: the alarm is accepted, scheduled,
and delivered at least 10 minutes late (10–30 in Doze), with nothing in the JS
return value saying so. A "get off at the next stop" arriving twenty minutes
late does not merely fail to help — it sends the rider to the wrong village.

The degradation rule in `docs/plans/notifications/11-platform-compliance.md`
§A1.1 — disable `alight`/`complete`, bias `leaveNow`/`change` early, say *around*
rather than a minute — is only implementable if the gate is **readable**. Hence
this module.

## What it is not

Not a scheduler. `expo-notifications` still does all scheduling; this only
answers "will the next alarm be exact?" and offers the route to fix it.

## JS side

There is no `index.ts` here on purpose. The JavaScript wrapper lives with the
rest of the feature, in `lib/notifications/exact-alarms.ts`, which reaches this
module through `requireOptionalNativeModule('ExactAlarm')` — optional, so a
build that has not been prebuilt against it degrades to "assume precise" rather
than failing at import time.

## After changing anything here

Native config, so it needs `npx expo prebuild` and a native rebuild
(`npx expo run:android`). It cannot ship as an OTA update.
