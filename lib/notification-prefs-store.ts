/**
 * Notification preferences, device-local (KTD4, 03 §1).
 *
 * `zustand` + `persist` + `AsyncStorage`, matching every other preference store
 * in the app — `lib/profile-store.ts`, `lib/consent-store.ts`,
 * `lib/personalization-store.ts`, `lib/theme-prefs.ts`. `expo-sqlite` satisfies
 * the same requirement and was rejected: it would add a native dependency, a
 * schema-migration story and a new testing seam for an object of roughly ten
 * scalar fields that is read whole and written whole. There is no query, no
 * join and no row count here for it to earn its keep on.
 *
 * **Nothing here is ever synced to the API.** Not in this plan and not
 * implicitly: repo scope forbids the API change, and the requirement is
 * device-local precisely because not every rider signs in. A rider who never
 * creates an account must still get their alarms.
 *
 * Two things are deliberately absent (03 §5):
 *
 *  - **OS permission status.** The authoritative source is
 *    `Notifications.getPermissionsAsync()`, and a cached copy goes stale the
 *    instant the rider changes it in system settings — which the app cannot
 *    observe. It is re-read at every decision point instead.
 *  - **A global notifications on/off switch.** Armed state is per-journey, and a
 *    global flag would be a second source of truth competing with OS permission.
 *
 * The applied selection for a given journey is NOT here either: it lives on the
 * `ActiveTrack` that was armed with it (03 §3), so a journey armed with a
 * one-off choice keeps that choice even after the rider edits their defaults.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { staticIslandConfig } from '@/config/island';
import { defaultNotificationPrefs, type NotificationPrefs } from '@/lib/notifications/types';

export type { AlarmPref, AlarmType, NotificationPrefs } from '@/lib/notifications/types';
export {
  defaultNotificationPrefs,
  LEAD_MINUTE_OPTIONS,
  mergeNotificationPrefs,
} from '@/lib/notifications/types';

/**
 * Keyed by island, exactly as `profileStorageKey()` is, so a white-labelled
 * second island does not inherit São Miguel's preferences.
 */
export function notificationPrefsStorageKey() {
  return `azores_hub_notifications_${staticIslandConfig.islandKey}`;
}

interface NotificationPrefsState {
  /** The stored default, applied to every arm the rider does not customise. */
  defaults: NotificationPrefs;
  /**
   * Announcement ids already delivered on this device, `id → firedAt` (01 §3.4).
   *
   * Keyed on the cutover instant rather than the banner id — see
   * `announcementId()` in `lib/notifications/announcements.ts` for why that
   * distinction is load-bearing.
   */
  firedAnnouncements: Record<string, number>;
  /**
   * Announcement ids the rider has already been offered permission for, so the
   * in-app row is asked at most once per announcement rather than on every
   * launch (01 §4.1).
   */
  announcementPromptSeen: Record<string, boolean>;

  setDefaults: (prefs: NotificationPrefs) => void;
  markAnnouncementFired: (id: string, at: number) => void;
  markAnnouncementPromptSeen: (id: string) => void;
  /** Wipe on-device notification preferences (used by the GDPR delete flow). */
  resetAll: () => void;
}

export const useNotificationPrefsStore = create<NotificationPrefsState>()(
  persist(
    (set, get) => ({
      defaults: defaultNotificationPrefs(),
      firedAnnouncements: {},
      announcementPromptSeen: {},

      setDefaults: (prefs) => set({ defaults: prefs }),

      markAnnouncementFired: (id, at) =>
        set({ firedAnnouncements: { ...get().firedAnnouncements, [id]: at } }),

      markAnnouncementPromptSeen: (id) =>
        set({ announcementPromptSeen: { ...get().announcementPromptSeen, [id]: true } }),

      resetAll: () =>
        set({
          defaults: defaultNotificationPrefs(),
          firedAnnouncements: {},
          announcementPromptSeen: {},
        }),
    }),
    {
      name: notificationPrefsStorageKey(),
      storage: createJSONStorage(() => AsyncStorage),
      // 1 — first shipped shape, no migrations yet. `lib/profile-store.ts` is at
      // version 3 with a `migrate` function; that is the pattern to copy when a
      // field here changes shape.
      version: 1,
      /**
       * Listed explicitly rather than defaulted, so a field added later has to
       * make a deliberate decision about persistence — the same discipline
       * `lib/profile-store.ts` adopted after a session-scoped banner dismissal
       * was persisted by accident and hid the banner forever.
       */
      partialize: (state) => ({
        defaults: state.defaults,
        firedAnnouncements: state.firedAnnouncements,
        announcementPromptSeen: state.announcementPromptSeen,
      }),
    },
  ),
);
