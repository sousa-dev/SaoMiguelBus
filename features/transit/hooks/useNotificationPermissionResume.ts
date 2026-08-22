/**
 * Finish what the rider started, and notice when permission goes away.
 *
 * Two jobs, both on the same foreground signal, because both are answers to
 * "something may have changed in system settings while we were not looking."
 *
 * **1. Resume (05 §3.3).** The rider tapped *Open Settings* from the blocked
 * sheet, granted permission, and came back. Without this they return to an
 * unchanged screen and have to remember what they were doing and repeat the
 * whole flow — and the sheet copy explicitly promised otherwise. Returning
 * WITHOUT granting discards the intent in silence: they looked and chose not to,
 * and re-showing the sheet would be nagging.
 *
 * **2. Revocation (05 §3.4).** Permission can be switched off outside the app at
 * any time; the OS keeps the scheduled notifications and simply stops displaying
 * them, and gives the app no callback. Noticing on foreground is the only way to
 * warn anyone. The alarms are deliberately **not cancelled** — re-granting
 * restores delivery for everything still pending, and throwing away the rider's
 * setup over a toggle they may flip back in ten seconds would be its own bug.
 *
 * Mounted once in the app shell rather than on a card, so the resume survives the
 * rider having scrolled away from the journey they armed.
 */

import { useCallback, useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { logger } from '@/lib/logger';
import {
  trackPermissionRevokedDetected,
  trackSettingsReturned,
} from '@/lib/notifications/analytics';
import { hasPendingIntent, takePendingIntent } from '@/lib/notifications/pending-intent';
import { armTrack, permissionGate } from '@/lib/notifications/scheduler';
import { useNotificationUiStore } from '@/lib/notifications/ui-store';
import { useProfileStore } from '@/lib/profile-store';

export function useNotificationPermissionResume() {
  const check = useCallback(async () => {
    const gate = await permissionGate();
    const store = useProfileStore.getState();

    // Warn only when there is something to lose: a rider with nothing armed does
    // not need telling that alerts they never asked for are off.
    const armedCount = store.tracking.active.filter((t) => t.notify).length;
    const revoked = gate !== 'granted' && armedCount > 0;
    const wasRevoked = useNotificationUiStore.getState().permissionRevoked;
    useNotificationUiStore.getState().setPermissionRevoked(revoked);
    // Only on the transition, so a rider who leaves it revoked does not emit an
    // event on every foreground for the rest of the install.
    if (revoked && !wasRevoked) {
      trackPermissionRevokedDetected(armedCount);
    }

    // Read before consuming, so the "did they come back and finish" event can be
    // emitted for the refusal case too — that ratio is the conversion rate of
    // the whole Settings recovery path (08 §2).
    const returning = hasPendingIntent();
    const intent = takePendingIntent();
    if (returning) {
      trackSettingsReturned(gate, gate === 'granted');
    }
    if (!intent || gate !== 'granted') {
      // Consumed either way. An intent that survived a refusal would fire on
      // some later foreground the rider has long since stopped connecting to
      // the thing they tapped.
      return;
    }

    if (intent.kind !== 'armTrack') {
      return;
    }
    const target = store.tracking.active.find((t) => t.id === intent.trackId);
    if (!target) {
      // The track expired or was stopped while they were away. Nothing to arm,
      // and nothing worth saying about it.
      return;
    }

    const result = await armTrack(target, intent.prefs);
    if (result.ids.length > 0) {
      useProfileStore.getState().setTrackNotifications(target.id, intent.prefs, result.ids);
      useNotificationUiStore.getState().markResumed(target.id);
    }
  }, []);

  useEffect(() => {
    void check();
    const previous = { state: AppState.currentState };
    const onChange = (next: AppStateStatus) => {
      const wasBackground = previous.state !== 'active';
      previous.state = next;
      if (next === 'active' && wasBackground) {
        void check().catch((error) => logger.warn(`permission resume failed: ${String(error)}`));
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [check]);
}
