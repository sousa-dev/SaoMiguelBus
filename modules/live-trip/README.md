# `live-trip` — a local Expo module

The Uber-style persistent live trip bar: an Android foreground-service ongoing
notification, and (once the Swift half lands) an iOS Live Activity. One module,
one JS name (`LiveTrip`), because `requireOptionalNativeModule` resolves by
name and the whole point of the JS surface in `lib/live-trip/` is that callers
never have to `Platform.OS` switch between two implementations of one idea.

## Why a foreground service, not `expo-notifications`

`expo-notifications` schedules alarms; it has no ongoing/ProgressStyle notification
API and no way to keep polling once the JS runtime is suspended. A rider who
locks their phone needs the bar to keep counting down, which means a real
Android `Service` that outlives the activity — `LiveTripService`, declared
`foregroundServiceType="dataSync"`.

## Why the `<service>` lives in this module's own manifest

Unlike `modules/exact-alarm`, whose manifest is deliberately empty because
`SCHEDULE_EXACT_ALARM` is a user-visible permission that belongs in `app.json`
for review, a `<service>` element is not a permission — it is a component whose
`android:name` is a Kotlin class file. Declaring it in `app.json` would let a
class rename silently break at runtime on a device nobody is holding; declaring
it here means the manifest entry and the class it names move together.

Permissions (`FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_DATA_SYNC`,
`POST_PROMOTED_NOTIFICATIONS`) still go in `app.json`, for the same reviewability
reason `exact-alarm`'s README states.

## What it does not do

Does not talk to JS about *how* to render — templates are resolved in
JavaScript (`lib/live-trip/templates.ts`) from `locales/*.json` and handed down
once at trip start. Native only substitutes `{placeholder}` values into an
already-localized string. See `LiveTripNotification.kt`.

Does not retry forever. Any polling failure keeps the last good notification and
tries again next tick — the bar going quiet for a minute is fine; the bar
disappearing is not.

## JS side

No `index.ts` here, matching `exact-alarm`. The wrapper lives in
`lib/live-trip/native.ts`, reached through
`requireOptionalNativeModule('LiveTrip')` so a build that has not been
prebuilt against this module degrades to "unsupported" rather than crashing at
import time.

## After changing anything here

Native config — needs `npx expo prebuild` and a native rebuild
(`npx expo run:android` / a new EAS build). Cannot ship as an OTA update.
