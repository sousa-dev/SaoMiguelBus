---
title: "Premium gating and the paywall CTA"
parent: ./00-overview.md
---

# 06 — Premium gating

Satisfies **R8, R16**, and the requested behaviour: *premium activates, free opens the paywall.*

---

## 1. Nothing new is built

`features/premium/hooks/usePremiumGate.ts` already is this feature. Its own header:

> - Premium → run the action immediately.
> - Signed-out free → present the RevenueCat paywall directly (anonymous purchase).
> - Signed-in free → present the RevenueCat paywall (`presentIfNeeded`).

Arming notifications is one more caller:

```ts
const { guardPremiumAction } = usePremiumGate();

const onNotify = () => {
  // Disarming is never gated — a lapsed subscriber must always be able
  // to turn something off. Same rule TrackButton applies to stopping.
  if (armed) {
    void disarm();
    return;
  }
  void guardPremiumAction(() => openPreferenceSheet(), 'notify_journey');
};
```

The gate's hard-won behaviours come along for free, and none of them should be
re-implemented:

- **`PAYWALL_RESULT.NOT_PRESENTED` counts as entitled.** RevenueCat declining to sell to an
  account that already holds the entitlement is not "nothing to do." Treating it as such is
  the bug commit `fc8a14d` fixed — *"a granted account was premium to RevenueCat and free to
  the app."*
- **Purchase and restore fall straight through into the action.** No second tap.
- **A failure says so** (`premiumUnavailableTitle`), rather than a dead button — the bug
  `b764b2a` fixed: *"a paywall that cannot be shown must not be a dead tap."*
- **Cancel is silent.** The rider chose it.

---

## 2. Sources

`guardPremiumAction(action, source)` threads `source` into `track('billing', 'paywall_open', …)`
for funnel breakdown. Existing values are `track_start` and `track_pin`. Three added:

| Entry point | Source |
|---|---|
| Bell on a journey card | `notify_journey` |
| Bell on a trip / route card | `notify_trip` |
| Notifications row in settings | `notify_settings` |

Distinct rather than one shared `notify` value, because the question worth answering later is
*which* surface converts — the card in the results list or the settings row.

---

## 3. Entitlement lapse (R16)

A subscription can expire, be refunded, or be cancelled. Journey alarms already scheduled
would otherwise keep firing indefinitely for a rider no longer paying.

On the entitlement transitioning premium → free (observed where `lib/entitlement-store.ts` and
`useReconcileEntitlement` already reconcile):

1. Cancel every notification belonging to an armed track.
2. Clear `notify` and `notificationIds` on those tracks.
3. Leave the tracks themselves alone — the foreground widget is separately gated by
   `usePremium()` in `ActiveTrackingSection` and will simply stop rendering.
4. **Leave service announcements untouched.** They are free, and a lapsed subscriber has
   exactly the same right to be told the timetables changed.

No dialog. A rider whose subscription lapsed does not need a notification about losing
notifications; the bell is empty next time they look, and the paywall is one tap away.

### 3.1 The reverse

Re-subscribing does **not** silently re-arm previously armed journeys. Those alarms were
cancelled and their itineraries are probably stale. The rider re-arms what they still want.
Re-arming automatically would deliver a surprise notification for a bus they have long since
stopped taking.

---

## 4. Offline

The paywall is a RevenueCat network call and cannot be presented offline. `usePaywall` already
returns `null` in that case and `guardPremiumAction` surfaces `premiumUnavailableTitle` —
handled, no new work.

An **already-premium** rider can arm alarms offline without issue: planning is pure local
maths over an itinerary already in the store, and `scheduleNotificationAsync` is a local OS
call. This is a genuine strength worth keeping in mind — the feature works in the parts of the
island where the app's other features do not.

Service announcements need a cached bootstrap, which `useBootstrapCached` persists for 24h, so
they too survive being offline at launch.

---

## 5. What free riders can still do

| Action | Free |
|---|---|
| Receive service announcements | ✅ Fully, ungated |
| See the bell on cards | ✅ Always visible — a hidden feature sells nothing |
| Tap the bell | ✅ → paywall |
| See what the alarms are, in settings | ✅ Listed with a `Crown` badge and a one-line description each |
| Arm a journey alarm | ❌ Premium |
| Disarm anything already armed | ✅ Always |

Listing the alarm types in settings before the paywall is deliberate: the RevenueCat paywall is
a generic offering screen, so if the rider learns what they are buying only after it appears,
they learn it too late.
