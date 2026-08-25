# Agent prompt — implement notifications

Paste everything below the line into a fresh session with the working directory set to
`SaoMiguelBus`.

---

## Task

Implement notifications for the São Miguel Hub mobile app, following the plan set in
`docs/plans/notifications/`.

**Read the plan before writing any code.** Start with `docs/plans/notifications/README.md`,
then `00-overview.md`. Those two give you the shape; read the rest as each build unit needs
them. The plan is authoritative — where this prompt and the plan disagree, the plan wins;
where the plan and the existing code disagree, stop and ask.

Two notification classes ship together:

1. **Service announcements** — free, ungated, one-shot, fired from config the server already
   sends in `bootstrap.transitSchedule`. First instance is the 1 September 2026 network
   cutover.
2. **Journey alarms** — premium, opt-in per journey, four types (leave now / change is coming /
   get off at next stop / journey complete), scheduled against a tracked itinerary's timetable.

Everything is a **local** notification. No backend involved.

## Build order

`10-rollout-and-risks.md` §1 lists 19 units with their dependencies. Work them in order. Units
1–10 are the premium feature, 11–12 the free announcement channel, 13–19 cross-cutting.

Do not start unit N+1 until unit N's tests pass. Report progress per unit, not in one lump at
the end.

## Hard constraints

These are decisions already taken. Do not revisit them, do not "improve" on them, and do not
implement something adjacent because it seems better:

- **Never touch `SaoMiguelBus-api`.** The scope is this repo only. If something appears to need
  an API change, it doesn't — re-read the plan, and if it genuinely does, stop and ask.
- **No per-stop ("notify at every stop") alarms.** Rejected on the iOS 64-pending-notification
  cap. See `00-overview.md` KTD5.
- **No remote push.** No device tokens, no Expo push, no `getExpoPushTokenAsync`.
- **No Expo Web support.** This project does not use the web build. Native only.
- **Do not fold notifications into the existing track button.** The bell is a third, separate
  action. `02-journey-alarms-ux.md` §2 explains what breaks otherwise.
- **Do not add a React renderer, `@testing-library/react-native`, or a native-module mock
  layer to the test setup.** The runner is `tsx --test` over pure functions and must stay that
  way. Design for testability instead — see `09-testing.md` §1.
- **Do not hardcode subscription prices** anywhere (`AGENTS.md`).

## Read these first

**Before writing any code**, read the exact versioned Expo 56 docs for
`expo-notifications` at <https://docs.expo.dev/versions/v56.0.0/sdk/notifications/>. `AGENTS.md`
opens with this instruction for a reason: the API has changed across recent SDKs and your
training data likely predates it. Confirm the current shape of `SchedulableTriggerInputTypes`,
`setNotificationHandler`'s return fields, and the permissions API against those docs, not from
memory.

Then read these source files in full — they carry the conventions and the traps:

| File | Why |
|---|---|
| `lib/bus-tracking.ts` | The itinerary maths you will reuse. Its header documents every bug already fixed here |
| `features/transit/components/TrackButton.tsx` | The action-row pattern the bell joins |
| `features/premium/hooks/usePremiumGate.ts` | The premium gate — already does exactly what this feature needs |
| `features/transit/lib/schedule-config.ts` | The no-date-literals discipline, and `canTrack` |
| `lib/profile-store.ts` | Persist/migrate patterns, and where tracking state lives |
| `features/transit/hooks/useAutoTrackPinnedRoutes.ts` | The launch/foreground sweep cadence to mirror |

## Traps specific to this codebase

Each of these has already caused a production bug here. The plan cites them; this is the short
list so you recognise them while typing.

1. **Never `toISOString()` for a local date.** It is UTC. At 23:30 Azores winter it already
   reads *tomorrow*, which once anchored a bus leaving in 15 minutes to tomorrow's midnight and
   displayed a 24-hour countdown. Use `localIsoDate()` and local `Date` construction.
2. **Do not re-derive day offsets.** `legSpans()` in `lib/bus-tracking.ts` already handles
   midnight crossings, cross-leg carry, and the "leg looks like it goes backwards" case. Export
   it (visibility change only) and consume it. Reimplementing is the single most likely way to
   ship a wrong alarm.
3. **Never sort a leg's stops.** Travel order is what the server sent. Sorting on
   minutes-since-midnight scrambles exactly the past-midnight legs this feature must get right.
4. **Emit i18n keys, never resolved strings**, from pure modules. `TrackLabel` in
   `lib/bus-tracking.ts` is the pattern. A Portuguese subscriber once read a paid widget in
   English because a string was baked in.
5. **Minutes interpolate as `minutes`, never `count`.** `count` triggers i18next pluralisation,
   and every locale here abbreviates the unit invariantly.
6. **Never schedule an instant in the past.** The search defaults to `00:00` and returns the
   whole service day, so departed journeys are routinely on screen. A past `DATE` trigger fires
   immediately on some platforms.
7. **Android notification channels are immutable after creation.** Importance is a first-run
   decision; fixing it later needs a new channel id, not a patch release.
8. **Locale parity is enforced by CI.** `__tests__/lib/locale-parity.test.ts` fails if a key
   exists in one of the eight `locales/*.json` and not the others. Add keys to all eight in the
   same change.
9. **Cancellation must hang off `pruneTracking`.** It runs every 30s and silently drops expired
   and wrong-dataset tracks. Miss it and alarms fire for journeys the app has forgotten.
10. **Do not key the announcement dedupe on `banner.id`.** It is the obvious choice and it is
    wrong. `resolveBanner()` merges a per-phase override *including its `id`*, and the deployed
    config carries one: the id flips from `azoresbus-preview-2026-08` to `azoresbus-live-2026-09`
    at the exact instant the announcement is due, so the app would schedule it twice. Derive the
    key from `cutoverAt` instead — `01-service-announcements.md` §3.1.1.
11. **Do not read `trackingEnabled`, and do not "fix" it.** Production has it `false`, which
    reads as though premium tracking is switched off. It is not: `resolveScheduleUi` computes
    `showTracking` from it and **no component in the app consumes it**. Gate the bell on
    `canTrackTrips`. Flipping the flag is a no-op that looks like a fix —
    `10-rollout-and-risks.md` §3.1.

## Code style

Match the surrounding code, which in this repo means something unusual and deliberate:
**modules and non-obvious decisions carry long explanatory comments that say *why*, not what**,
and cite the constraint or the bug that forced the shape. Read the header of
`lib/bus-tracking.ts`, `features/transit/lib/schedule-config.ts`, or
`features/transit/hooks/useAutoTrackPinnedRoutes.ts` before writing your own.

Terse comments are a mismatch here. So is commenting the obvious. Where the plan gives a
reason for a decision, put that reason in the code — that is where the next person will look.

Otherwise: TypeScript strict, `@/` import alias, `lucide-react-native` icons, theme tokens from
`lib/tokens.ts` and `useAppTheme()`, existing `components/ui/*` primitives. No new dependencies
beyond `expo-notifications`.

## Verification

Run after every unit:

```bash
npm run test:unit          # tsx --test — must be green before moving on
npx tsc --noEmit           # strict mode
```

Do not claim a unit is done without showing the passing output. If a test fails, fix the cause;
do not adjust the assertion to match the behaviour.

Device QA (`09-testing.md` §6) needs a dev build — `npx expo run:ios` / `run:android` — and is
the human's job, not yours. Produce the checklist state, don't claim to have run it.

## Definition of done, per unit

- Code written, matching the plan's specified shape and this repo's comment conventions
- Unit tests written and passing where the unit is pure
- `npx tsc --noEmit` clean
- New user-visible strings present in **all eight** locale files
- `app.json` `version` patch segment bumped (standing project rule for any mobile app change)
- A one-paragraph report: what changed, what you verified, anything you had to decide

## Things to raise rather than decide

Stop and ask if you hit any of these:

- The plan is ambiguous or contradicts the code as it actually stands
- A change appears to require touching `SaoMiguelBus-api`
- `expo-notifications` in SDK 56 does not offer something the plan assumes
- An existing test breaks and the fix is not obviously in your new code
- You are about to add a dependency other than `expo-notifications`

Do not commit or push unless asked. The branch is `revamp`.

## Known open item

`02-journey-alarms-ux.md` §6 carries one decision flagged for review: automatically-started
tracks from `useAutoTrackPinnedRoutes` get no notifications, with an opt-in switch (default
off) to enable them for pinned routes. Implement as written, but surface it in your report on
that unit so the human can confirm.

## Production config — verified, no blocker

The cutover **is armed**. Verified against production 2026-08-21
(`Island.feature_flags.azoresbus` for `sao-miguel`):

```json
"cutoverAt":        "2026-09-01T00:00:00+00:00",
"bannerUntil":      "2026-10-01T00:00:00+00:00",
"previewEnabled":   true,
"trackingEnabled":  false,
"banner": { "id": "azoresbus-live-2026-09",
            "phases": { "preview": { "id": "azoresbus-preview-2026-08", … } } }
```

The AzoresBus dataset is synced and live. **No configuration change is needed** — build against
this as real.

Three things in that blob will mislead you if you take them at face value:

1. **`trackingEnabled: false` does not mean tracking is off.** `showTracking` is computed from
   it and read by nothing. Gate the bell on `canTrackTrips`, never on `trackingEnabled`. See
   `10-rollout-and-risks.md` §3.1 — do not "fix" the flag as part of this work.
2. **`banner.id` is not stable.** `resolveBanner()` merges the `phases.preview` override
   including its `id`, so it changes from `azoresbus-preview-2026-08` to `azoresbus-live-2026-09`
   at the exact instant the announcement fires. Key the announcement dedupe on `cutoverAt`, not
   on `banner.id`. See `01-service-announcements.md` §3.1.1 — this was a real bug caught in
   review, and the regression test is specified in `09-testing.md` §3.
3. **`+00:00` is Azores local midnight, not an hour out.** Azores is UTC−1 in winter but UTC+0
   under summer DST, and 1 September falls inside DST.

Test the announcement path with `app/settings.tsx`'s *Simulate cutover* developer control,
which drives `simulatePhase()` — not by moving the device clock, which the server-side phase
derivation is specifically designed to ignore.
