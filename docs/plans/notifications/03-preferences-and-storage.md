---
title: "Preferences and storage"
parent: ./00-overview.md
---

# 03 — Preferences and storage

What the rider chooses, and where it lives. Satisfies **R11–R12**.

---

## 1. Storage choice (KTD4)

The requirement is **device-local, no account required** — not every rider signs in, and
notification preferences must work for the ones who never do.

`zustand` + `persist` + `AsyncStorage`, matching every other preference store in the app:

| Store | File |
|---|---|
| Profile (favourites, tracking, pins) | `lib/profile-store.ts` |
| Consent | `lib/consent-store.ts` |
| Personalization | `lib/personalization-store.ts` |
| Theme | `lib/theme-prefs.ts` |
| **Notifications (new)** | `lib/notification-prefs-store.ts` |

`expo-sqlite` was considered and rejected. It satisfies the same requirement while adding a
native dependency, a schema-migration story, and a new testing seam — for an object of roughly
ten scalar fields that is read whole and written whole. There is no query, no join, and no
row count here that SQLite would earn its keep on.

> **Preferences are never synced to the API.** Not in this plan, and not implicitly: no
> `postProfile`-style call, no inclusion in any account payload. Repo scope forbids the API
> change, and the "not everyone creates an account" requirement makes device-local the correct
> home regardless.

---

## 2. Shape

```ts
/** One alarm type's settings. */
export interface AlarmPref {
  enabled: boolean;
  /** Lead time in minutes. Ignored by types that have no lead time. */
  leadMinutes: number;
}

export interface NotificationPrefs {
  leaveNow: AlarmPref;      // default { enabled: true,  leadMinutes: 10 }
  change: AlarmPref;        // default { enabled: true,  leadMinutes: 5 }
  alight: AlarmPref;        // default { enabled: true,  leadMinutes: 0 }
  complete: AlarmPref;      // default { enabled: false, leadMinutes: 0 }
  /** Opt-in for the auto-track sweep — see 02 §6. Default false. */
  notifyPinnedRoutes: boolean;
}

interface NotificationPrefsState {
  /** The stored default, applied to every arm the rider does not customise. */
  defaults: NotificationPrefs;
  /** Announcement ids already delivered on this device — see 01 §3.4. */
  firedAnnouncements: Record<string, number>;
  /** Set once the rider has been offered permission for a given announcement id. */
  announcementPromptSeen: Record<string, boolean>;

  setDefaults: (prefs: NotificationPrefs) => void;
  markAnnouncementFired: (id: string, at: number) => void;
  markAnnouncementPromptSeen: (id: string) => void;
  resetAll: () => void;
}
```

### 2.1 Why `leadMinutes` on every type even when unused

`alight` and `complete` have no meaningful lead time — "one stop before" and "on arrival" are
the units. Keeping the field uniform means the sheet, the planner, and the persist migration
all handle one shape rather than a union, and a future "alight X minutes early" needs no
migration. The planner ignores the field for those types; that is documented at the call site
rather than encoded as an absent property.

### 2.2 Persist configuration

```ts
{
  name: notificationPrefsStorageKey(),   // `azores_hub_notifications_${islandKey}`
  storage: createJSONStorage(() => AsyncStorage),
  version: 1,
}
```

Keyed by island, exactly as `profileStorageKey()` is (`lib/profile-store.ts:165`), so a
white-labelled second island does not inherit São Miguel's preferences.

Version starts at 1 with no migrations. `lib/profile-store.ts` is at version 3 with a
`migrate` function; the pattern to follow when a field changes shape is there.

---

## 3. Per-journey override (R11)

The stored `defaults` are a **starting value**, not the applied value.

```
arm tapped
   → sheet opens, pre-filled from `defaults`
   → rider adjusts (or doesn't)
   → "Save as my default" checked?
        yes → setDefaults(selection)   AND arm with `selection`
        no  → arm with `selection`, `defaults` untouched
```

The applied selection is stored **on the track**, not in this store:

```ts
// added to ActiveTrack in lib/profile-store.ts
interface ActiveTrack {
  // …existing fields…
  /** The prefs this track was armed with. Absent = not armed for notifications. */
  notify?: NotificationPrefs;
  /** OS identifiers of its pending notifications, for cancellation (KTD9). */
  notificationIds?: string[];
}
```

Two consequences worth stating:

- **A journey armed with a one-off selection keeps that selection** even if the rider later
  changes their defaults. The alarms already scheduled reflect what they agreed to.
- **`notify` being present *is* the armed state.** There is no separate boolean to fall out of
  sync with the presence of `notificationIds`.

Both fields are optional, so persisted tracks written by the current build load unchanged —
the same tolerance `liftTrackedRecord` already applies. Nothing is dropped on read.

---

## 4. Interaction with the existing GDPR flows

`app/settings.tsx` offers **Export my data** and **Delete my data**. Both need this store.

### 4.1 Export

`shareJsonExport('saomiguelhub-data-export.json', payload, …)` builds a payload from the
stores. Notification defaults are user-provided preferences and belong in it. Add:

```ts
notifications: useNotificationPrefsStore.getState().defaults,
```

`firedAnnouncements` is excluded — it is delivery bookkeeping, not personal data the rider
would recognise.

### 4.2 Delete

`deleteData()` currently calls `resetAll()` on the profile and personalization stores. Two
additions, in this order:

```ts
await cancelAllScheduledNotifications();       // FIRST — see below
useNotificationPrefsStore.getState().resetAll();
```

**Cancelling before resetting is not cosmetic.** Pending notifications live in the OS, not in
AsyncStorage. Wiping the store without cancelling leaves alarms scheduled that will fire days
later, on a device whose owner has just asked for their data to be deleted, with no record left
of why. Resetting first would also destroy the `notificationIds` needed to cancel them.

`useProfileStore.getState().resetAll()` already removes the tracks; it must gain the same
cancellation, specified in [05](./05-permissions-and-lifecycle.md) §5.

---

## 5. What is deliberately *not* stored

| Not stored | Why |
|---|---|
| OS permission status | Authoritative source is `Notifications.getPermissionsAsync()`. A cached copy goes stale the moment the rider changes it in system settings, and the app cannot observe that |
| A global "notifications on/off" switch | Armed state is per-journey. A global switch would be a second, conflicting source of truth against OS permission |
| Delivery receipts | Local notifications report no delivery. Recording "we scheduled it" as "they got it" would be false |
| Anything in `SecureStore` | These are preferences, not secrets. `lib/secure-token.ts` is for the auth token |
