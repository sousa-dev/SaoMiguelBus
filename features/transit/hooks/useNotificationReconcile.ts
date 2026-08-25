/**
 * Bring pending notifications back into agreement with the store, once a launch.
 *
 * The OS and the app drift for ordinary reasons — an app update, a crash between
 * scheduling and persisting the ids, alarms that have already fired — and the
 * two failures that follow are both silent: the OS holding alarms for journeys
 * the app has forgotten, and a filled bell promising alarms the OS no longer
 * has.
 *
 * **Waits for rehydration before doing anything.** The persisted tracks are the
 * input, and running against an empty store would classify every pending alarm
 * as an orphan and cancel all of them — turning a launch into a silent disarm of
 * everything the rider had set up (05 §5.1). The same `hasHydrated` /
 * `onFinishHydration` pattern `_layout.tsx` already uses for the auth store.
 *
 * Launch only, deliberately. Unlike `useAutoTrackPinnedRoutes` there is no
 * foreground sweep here: alarms are handed to the OS at arm time and are not
 * affected by the app coming and going, so re-reconciling on every resume would
 * be an OS round-trip for nothing.
 */

import { useEffect } from 'react';

import { isEntitlementStoreHydrated } from '@/lib/entitlement-store';
import { getIsPremium } from '@/lib/premium-store';
import { reconcileNotifications } from '@/lib/notifications/scheduler';
import { logger } from '@/lib/logger';
import { useProfileStore } from '@/lib/profile-store';

export function useNotificationReconcile() {
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        // A lapsed subscriber must not have their alarms re-armed here.
        // `useEntitlementLapseCancellation` clears them, and without this guard
        // the two would race: reconcile re-arms, the lapse hook clears, and
        // whichever finishes last wins (06 §3).
        if (isEntitlementStoreHydrated() && !getIsPremium()) {
          return;
        }
        const { active } = useProfileStore.getState().tracking;
        const updates = await reconcileNotifications(active);
        if (cancelled || updates.length === 0) {
          return;
        }
        const store = useProfileStore.getState();
        for (const update of updates) {
          if (update.armed) {
            // Re-armed: the preferences are unchanged, only the OS ids moved.
            const track = store.tracking.active.find((t) => t.id === update.trackId);
            if (track?.notify) {
              store.setTrackNotifications(update.trackId, track.notify, update.notificationIds);
            }
          } else {
            // Every alarm has passed. Clear the armed state so the bell stops
            // claiming something the OS is not going to do.
            store.clearTrackNotifications(update.trackId);
          }
        }
      } catch (error) {
        // Deliberately silent, exactly as the auto-track sweep is: a
        // reconciliation that fails leaves the widget as it was, and an
        // automatic action that opens a dialog is worse than one that does
        // nothing.
        logger.warn(`notification reconciliation failed: ${String(error)}`);
      }
    };

    if (useProfileStore.persist.hasHydrated()) {
      void run();
      return () => {
        cancelled = true;
      };
    }

    const unsubscribe = useProfileStore.persist.onFinishHydration(() => {
      void run();
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);
}
