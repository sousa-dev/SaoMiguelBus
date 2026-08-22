/**
 * Journey alarms stand down when the subscription does (06 §3, R16).
 *
 * A subscription can expire, be refunded, or be cancelled. Alarms already handed
 * to the OS would otherwise keep firing indefinitely for someone who is no
 * longer paying — and, worse, keep firing for a journey whose itinerary is by
 * then months stale.
 *
 * Deliberately NOT a pure edge-triggered check on premium → free. That would
 * miss the common case: a subscription that lapses while the app is closed. On
 * the next launch there is no transition to observe, the launch reconciliation
 * happily finds the alarms still pending, and a lapsed rider keeps a paid
 * feature indefinitely. So the condition is the state, not the change — "not
 * premium, and something is armed" — which is also idempotent, since clearing
 * removes the thing that made it true.
 *
 * **The guard that makes this safe is hydration.** `usePremium()` reads false
 * until the entitlement store rehydrates from AsyncStorage, so acting before
 * then would cancel a paying subscriber's alarms on every single launch. That is
 * the one way this hook could do real damage, and it is why nothing happens
 * until `isEntitlementStoreHydrated()` is true.
 *
 * Three things are deliberately left alone:
 *
 *  - **The tracks themselves.** `ActiveTrackingSection` is separately gated on
 *    `usePremium()` and simply stops rendering; deleting the rider's tracks
 *    would be a second, unrelated punishment.
 *  - **Service announcements.** They are free, and a lapsed subscriber has
 *    exactly the same right to be told the timetables changed.
 *  - **Re-subscribing does not re-arm.** Those alarms were cancelled and their
 *    itineraries are probably stale; re-arming automatically would deliver a
 *    surprise notification for a bus the rider stopped taking months ago
 *    (06 §3.1). They re-arm what they still want.
 *
 * No dialog either. Someone whose subscription lapsed does not need a
 * notification about losing notifications.
 */

import { useEffect } from 'react';

import { isEntitlementStoreHydrated, useEntitlementStore } from '@/lib/entitlement-store';
import { logger } from '@/lib/logger';
import { usePremium } from '@/lib/premium-store';
import { useProfileStore } from '@/lib/profile-store';

export function useEntitlementLapseCancellation() {
  const isPremium = usePremium();
  // Subscribing to the store as well as to `usePremium()` gives this effect a
  // reason to re-run when rehydration completes, which is the moment the answer
  // above becomes trustworthy.
  const hydrationTick = useEntitlementStore((s) => s.storeEntitlement ?? s.backendEntitlement);

  useEffect(() => {
    if (!isEntitlementStoreHydrated() || isPremium) {
      return;
    }
    const store = useProfileStore.getState();
    const armed = store.tracking.active.filter((t) => t.notify);
    if (armed.length === 0) {
      return;
    }
    logger.info(`entitlement lapsed — disarming ${armed.length} track(s)`);
    for (const track of armed) {
      // Cancels this track's pending alarms and clears both `notify` and
      // `notificationIds` in one step, so there is no window where the store
      // says armed and the OS holds nothing.
      store.clearTrackNotifications(track.id);
    }
  }, [isPremium, hydrationTick]);
}
