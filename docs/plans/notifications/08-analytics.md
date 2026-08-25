---
title: "Analytics"
parent: ./00-overview.md
---

# 08 — Analytics

---

## 1. The existing seam

`track(module, eventType, properties)` in `lib/analytics.ts`. Two guards are already applied
inside it and must not be duplicated at call sites:

- **Consent.** Returns immediately unless `useConsentStore.getState().hasAnalyticsConsent()`.
- **Admin.** Returns immediately for `isAdminUser()`, so staff testing does not pollute funnels.

Events are enqueued and flushed on a 2s debounce, and survive being offline via
`lib/analytics-queue.ts`.

### 1.1 Module string

A new module string, `notifications`, needs **no API change**: `AnalyticsEvent.module` is
`models.CharField(max_length=32, db_index=True)` with no `choices`
(`SaoMiguelBus-api/src/analytics/models.py:20`), and the reporting endpoints filter on it as a
free-text query parameter. This mirrors the precedent set by the Tours tab, which emits
`track('tours', …)` against a backend registry that names the app `events`.

Paywall events keep module `billing`, because `usePaywall` already emits them and that funnel
should stay in one place.

---

## 2. Events

### Journey alarms

| Event | Properties | Fired when |
|---|---|---|
| `notifications.arm` | `types` (csv), `lead_leave`, `lead_change`, `legs`, `transfers`, `alarms_scheduled`, `alarms_skipped_past`, `saved_default` | A journey is armed |
| `notifications.disarm` | `types`, `remaining_alarms`, `age_minutes` | The rider disarms |
| `notifications.arm_refused` | `reason` (`all_past` \| `permission_denied` \| `no_types`) | Arming attempted and refused |
| `notifications.sheet_open` | `mode` (`journey` \| `default`), `is_premium` | Preference sheet opened |
| `notifications.defaults_changed` | `types`, `lead_leave`, `lead_change`, `pinned_routes` | Stored default overwritten |

`alarms_skipped_past` is the one to watch. A high value means riders are routinely arming
journeys that have already departed, which points at `DEFAULT_SEARCH_TIME = '00:00'` returning
the full service day ([04](./04-scheduling-engine.md) §3.3) — a UX problem the notification
feature would merely be surfacing.

### Permission

| Event | Properties | Fired when |
|---|---|---|
| `notifications.permission_gate` | `gate` (`granted` \| `askable` \| `blocked`), `trigger` | Gate evaluated before any action |
| `notifications.permission_request` | `trigger` (`arm` \| `announcement_row` \| `settings_row`) | OS prompt actually shown |
| `notifications.permission_result` | `trigger`, `status` (`granted` \| `denied`), `can_ask_again` | OS prompt answered |
| `notifications.settings_opened` | `from` (`blocked_sheet` \| `revoked_warning` \| `settings_row`) | `Linking.openSettings()` called |
| `notifications.settings_returned` | `gate`, `resumed` (bool) | Foreground after a settings trip with a pending intent |
| `notifications.permission_revoked_detected` | `armed_tracks` | Foreground check finds permission gone while tracks are armed |

Three things worth reading together:

- **`permission_gate{gate: 'blocked'}` is the size of the recoverable audience** — riders who
  want alerts but cannot be prompted. If it is large, the Settings row in
  [02](./02-journey-alarms-ux.md) §4.4 is carrying real weight and deserves prominence.
- **`settings_opened` → `settings_returned{resumed: true}`** is the conversion rate of the whole
  §3.2–3.3 recovery path. A high `settings_opened` with a low `resumed` means riders are going
  to Settings and not finding the toggle — a copy problem, not a code one.
- **Grant rate by `trigger`** answers whether prompting after the preference sheet was right. If
  `announcement_row` converts far worse, the free channel's reach is the thing to fix.

### Service announcements

| Event | Properties | Fired when |
|---|---|---|
| `notifications.announcement_scheduled` | `announcement_id`, `hours_ahead` | Successfully scheduled |
| `notifications.announcement_skipped` | `announcement_id`, `reason` (`past` \| `already_fired` \| `no_permission` \| `settled`) | Resolved but not scheduled |
| `notifications.announcement_prompt_shown` | `announcement_id` | In-app permission row rendered |
| `notifications.announcement_opened` | `announcement_id` | Rider taps the notification |

`announcement_skipped{reason: no_permission}` is the direct measure of the 1 September reach
problem in [10](./10-rollout-and-risks.md) §2. It counts devices that *would* have been warned
and were not.

### Delivery and taps

| Event | Properties | Fired when |
|---|---|---|
| `notifications.received_foreground` | `type` | Fires while the app is open |
| `notifications.opened` | `type`, `minutes_from_scheduled` | Rider taps a journey alarm |

**There is no delivery receipt for a local notification.** `notifications.arm` proves the app
scheduled something; nothing proves the rider saw it. `notifications.opened` is a *lower bound*
on delivery and must never be reported as a delivery rate.

---

## 3. What is deliberately not tracked

| Not tracked | Why |
|---|---|
| Stop names, route numbers, origin/destination | The journey is the rider's movement pattern. Counts and durations answer the product questions; itineraries are not needed and are far more sensitive |
| Notification body text | Derivable from `type` |
| Exact fire timestamps | `hours_ahead` and `minutes_from_scheduled` are relative and sufficient |

This follows the existing posture in `SDD/07-gdpr-data-governance.md`: module-aware, consent-
gated, and no more than the question requires.

---

## 4. Questions this is meant to answer

1. **Does the bell convert?** `billing.paywall_open{source: notify_*}` → purchase rate, against
   the existing `track_start` / `track_pin` baseline.
2. **Which alarm types do riders actually keep?** `arm.types` distribution, and how far
   `defaults_changed` drifts from the shipped defaults. If nobody enables `complete`, the
   default-off decision was right; if everyone disables `change`, the lead time is wrong.
3. **Is the permission moment right?** `permission_result` grant rate by `trigger`.
4. **How many riders did the 1 September announcement reach?** `announcement_scheduled` versus
   `announcement_skipped{no_permission}` versus total actives.
5. **Are riders arming departed journeys?** `alarms_skipped_past`.
