---
title: "Journey alarms — CTA, entry points, and the preference sheet"
parent: ./00-overview.md
---

# 02 — Journey alarms UX

The premium half. Satisfies **R7–R11**, and the CTA behaviour requested directly: *premium
activates it, free opens the paywall.*

---

## 1. The action row today

`TrackButton` and `JourneyTrackButton` render a two-icon row — `MapPin` (track) and `Pin`
(pin) — appearing in exactly three places:

| Component | Line | Which button |
|---|---|---|
| `features/transit/components/JourneyCard.tsx` | 169 | `JourneyTrackButton` (multi-leg journey) |
| `features/transit/components/JourneyCard.tsx` | 374 | `TrackButton` (single trip) |
| `features/transit/components/RouteCard.tsx` | 189 | `TrackButton` (single trip) |

Both already gate through `guardPremiumAction` with sources `track_start` and `track_pin`.
Notifications become a **third icon in the same row**, in both components, with the same gate
and a new source.

```
  [ 📍 Track ]  [ 📌 Pin ]  [ 🔔 Notify ]
```

`Bell` / `BellRing` from `lucide-react-native` (already a dependency, already the icon
`AlertBell` uses for operator notices — consistent rather than novel).

---

## 2. Why a third button and not a change to Track (KTD8)

Folding alarms into the existing track button is simpler and is the wrong call:

- **It silently changes a paid button.** A subscriber who has tracked journeys for months
  would, on update, start receiving phone alerts they never asked for. That arrives as a
  one-star review, not as a feature.
- **`useAutoTrackPinnedRoutes` starts tracks the rider never tapped.** The sweep arms up to
  four tracks per day from pinned routes, deliberately and silently ("Deliberately silent. An
  automatic action that opens a dialog is worse than one that does nothing"). If tracking
  implied notifying, that sweep would become an automatic notification generator. See §6.
- **The OS permission prompt needs an honest trigger.** "You tapped a bell" is one. "You
  tapped the thing you have always tapped" is not.
- **"Stop notifying me" and "stop showing me the countdown" are different requests** and need
  different controls.

**Arming the bell also starts a track** (there is no coherent alarm on an untracked journey),
but never the reverse.

---

## 3. States of the bell

| Rider | Journey state | Icon | Tap does |
|---|---|---|---|
| Free | any | `Bell`, muted | Opens the RevenueCat paywall via `guardPremiumAction`. On purchase/restore, proceeds straight into arming — no second tap |
| Premium | not armed | `Bell`, tonal | Opens the preference sheet (§4), then arms |
| Premium | armed | `BellRing`, filled, accent | Disarms immediately, cancels pending notifications, no confirmation |
| Any | notifications **blocked** at OS level (denied, no re-prompt possible) | `BellOff` | Opens the *Turn on notifications* sheet, which routes to system Settings and resumes the arm on return ([05](./05-permissions-and-lifecycle.md) §3.2–3.3) |

**Disarming is never gated.** Exactly as `TrackButton` already handles stopping: *"Stopping an
active track is always allowed; starting is premium-gated."* A lapsed subscriber must always
be able to turn something off.

### 3.1 Visibility gates

The bell inherits the tracking gate, not the pinning gate:

```ts
const showNotify = canTrackTrips;   // same gate as the track button
```

`canTrack()` in `features/transit/lib/schedule-config.ts` returns false while the rider is
previewing timetables that are not yet in force. Alarms scheduled against a preview timetable
would fire on the wrong days — the exact hazard the comment on `canTrack` describes. Satisfies
**R15**.

Pinning is deliberately *not* gated this way (`canPin()` returns true unconditionally) because
a pin schedules nothing. An alarm does, so it follows tracking.

---

## 4. The preference sheet

Presented on **every arm**, pre-filled from the stored default (**R11**). Built on the existing
`components/ui/Sheet.tsx` (`visible` / `onClose` / `title` / `scrollable`).

```
┌──────────────────────────────────────────┐
│  Notify me about this journey        ✕   │
├──────────────────────────────────────────┤
│  ☑  Time to leave         [ 10 ▾ ] min  │
│  ☑  Change is coming      [  5 ▾ ] min  │
│  ☑  Get off next stop                   │
│  ☐  Journey complete                    │
│                                          │
│  ☐  Save as my default                  │
│                                          │
│           [   Notify me   ]              │
└──────────────────────────────────────────┘
```

### 4.1 Rows

| Row | Control | Default | Notes |
|---|---|---|---|
| Time to leave | checkbox + minutes stepper | on, 10 min | The walk-to-the-stop buffer. Options 2/5/10/15/20/30 |
| Change is coming | checkbox + minutes stepper | on, 5 min | Hidden entirely on a direct journey — there is no change to warn about |
| Get off at next stop | checkbox | on | Fires at the second-to-last stop of the final leg. No stepper: "one stop before" is the meaningful unit, not minutes |
| Journey complete | checkbox | **off** | Selected for the feature set, defaulted off: a rider standing at their destination rarely needs telling. Available to anyone who wants it |

### 4.2 "Save as my default"

Unchecked by default. Checked, the current selection overwrites the stored default and applies
to every future arm. Unchecked, the selection applies to **this journey only** and the stored
default is untouched — which is what makes §4 an override rather than a redefinition.

### 4.3 Empty selection

With every box unchecked the primary button is disabled and labelled *Choose at least one*.
Arming nothing while showing a filled bell would be a lie about what the app is going to do.

### 4.4 Where the default is edited outside the flow

A **Notifications** row in `app/settings.tsx`, alongside the existing Appearance / Language /
Privacy rows, opens the same sheet in "edit default" mode — no journey attached, primary
button reads *Save*.

This row is also the **permanent, discoverable route back** for a rider who turned notifications
off and later changes their mind — the "I rejected it before and now I want it on" path. It
carries a status line reflecting the live OS gate, read fresh on each open
([05](./05-permissions-and-lifecycle.md) §2.0):

| Gate | Status line | Row action |
|---|---|---|
| `granted` | *Alerts are on* | Opens the defaults sheet |
| `askable` | *Alerts are off* | Requests permission, then opens the defaults sheet |
| `blocked` | **Alerts are blocked in system settings** | Opens the *Turn on notifications* sheet → Settings ([05](./05-permissions-and-lifecycle.md) §3.2) |

A rider who blocked notifications months ago should not have to find a journey card and tap a
bell to discover why nothing arrives. Settings is where people look for this, so the answer and
the fix both live there.

The row also carries two switches, **both visible to free riders**:

| Switch | Default | Gated? |
|---|---|---|
| **Service updates** — timetable changes and service notices | on | **No.** Free feature; premium-gating the opt-out would be nonsense |
| **Also notify me for my pinned routes** (§6) | off | Premium |

The service-updates switch is required, not optional polish: App Store guideline 4.5.4 expects an
**in-app** method to opt out. Journey alarms already have one — disarm the bell — but
announcements are auto-scheduled, and on iOS the only alternative was the OS-wide toggle, which
kills bus alerts too. Android riders had per-channel control; iOS riders had all-or-nothing
([11](./11-platform-compliance.md) §I1.2).

On Android, `SCHEDULE_EXACT_ALARM` state surfaces here too when it is missing, with the route to
fix it ([05](./05-permissions-and-lifecycle.md) §4B.4).

---

## 5. Feedback after arming

No alert, no modal. The bell fills, and a caption appears on the card:

> 🔔 We'll tell you at 08:22, 08:47 and one stop before you arrive

Concrete times, because a rider needs to know the alarm is set to something *plausible* — and
because a wrong time visible now is a bug reported now, rather than a missed bus reported
later. The times come straight from the planner ([04](./04-scheduling-engine.md) §3), so the
caption and the scheduled instants cannot disagree.

Where an alarm was dropped for a reason the rider can act on, say so instead of hiding it:

| Condition | Caption |
|---|---|
| Some alarms in the past (journey already underway) | *Some alerts were skipped — this journey has already started* |
| All alarms in the past | Arming refused, bell stays empty, sheet shows *This journey has already departed* |
| Permission denied | Settings nudge, bell stays empty |

---

## 6. The auto-track sweep does not arm notifications

`useAutoTrackPinnedRoutes` starts tracks automatically for premium riders, up to four a day,
45 minutes before a pinned run departs. **Those tracks get no notifications.**

If they did, a rider with 20 pins would receive unexplained phone alerts for journeys they
never armed — an automatic action far louder than the deliberately silent one that hook
describes. The `ActiveTrack.auto` flag already distinguishes these tracks; the scheduler skips
any track carrying it.

**The commuter case is served instead by an explicit opt-in**, a single switch in the
notification default sheet:

> ☐ Also notify me for my pinned routes

Default **off**. Turned on, the sweep arms notifications using the stored default preferences
for the tracks it starts. This gives the "I take this every morning" rider the feature's
highest-value case without ambushing anyone who did not ask for it.

> **Flagged for review.** This is the one decision in the set taken without an explicit answer
> — it emerged from the arming decision rather than being asked. If it should default on, or
> the switch should not exist, say so and §6 changes; nothing downstream depends on it.

---

## 7. Where the free rider meets this

Three surfaces, all using `guardPremiumAction`, all leading to the paywall with a distinct
`source` for funnel breakdown ([08](./08-analytics.md) §2):

| Surface | Source |
|---|---|
| Bell on a journey card | `notify_journey` |
| Bell on a trip/route card | `notify_trip` |
| Notifications row in settings | `notify_settings` |

The bell is **always visible to free riders**, never hidden. A hidden feature sells nothing,
and the paywall is the intended destination for that tap.

The row in settings shows the four alarm types with a `Crown` badge and a one-line
description, so the paywall arrives after the rider knows what is behind it rather than as a
blind wall.
