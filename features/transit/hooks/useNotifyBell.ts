/**
 * The arming flow behind the bell, in one place so both action rows behave
 * identically.
 *
 * The order of the steps is the whole point (05 §2.1):
 *
 * ```
 * tap bell
 *   → armed?  → disarm immediately, never gated
 *   → guardPremiumAction  → paywall for free riders
 *   → preference sheet    → the rider chooses what they want
 *   → permissionGate()
 *       ├─ granted  → arm
 *       ├─ askable  → request → granted ? arm : quiet inline line
 *       └─ blocked  → the Settings sheet; NEVER call request
 * ```
 *
 * Requesting AFTER the sheet rather than before it is deliberate: the OS dialog
 * then lands on a rider who has just told the app exactly which alerts they
 * want. Since a denial is effectively permanent — one refusal on iOS, two on
 * Android 13+ — spending the single prompt at the highest-intent moment
 * available is the whole game.
 *
 * The `blocked` branch never calls `requestPermissionsAsync()`. The OS would
 * present nothing and resolve denied instantly, so the rider would press a
 * button and see the app do nothing at all — the same invisible dead tap commit
 * `b764b2a` fixed once already for the paywall.
 */

import { useCallback, useState } from 'react';

import { usePremiumGate } from '@/features/premium/hooks/usePremiumGate';
import { usePremium } from '@/lib/premium-store';
import { useNotificationPrefsStore } from '@/lib/notification-prefs-store';
import {
  trackArm,
  trackArmRefused,
  trackDefaultsChanged,
  trackDisarm,
  trackSettingsOpened,
  trackSheetOpen,
} from '@/lib/notifications/analytics';
import { setPendingIntent } from '@/lib/notifications/pending-intent';
import { armTrack, ensurePermission, permissionGate } from '@/lib/notifications/scheduler';
import type { NotificationPrefs } from '@/lib/notifications/types';
import { useNotificationUiStore } from '@/lib/notifications/ui-store';
import { useProfileStore, type ActiveTrack } from '@/lib/profile-store';

export interface NotifyBellState {
  armed: boolean;
  onPress: () => void;
  sheetVisible: boolean;
  blockedVisible: boolean;
  closeSheet: () => void;
  closeBlocked: () => void;
  onConfirm: (prefs: NotificationPrefs, saveAsDefault: boolean) => void;
  /** Records the resumption hint just before Settings opens (05 §3.3). */
  onOpenSettings: () => void;
  initialPrefs: NotificationPrefs;
  hasTransfers: boolean;
  /** True when arming was refused because the journey has already gone. */
  allPast: boolean;
  dismissAllPast: () => void;
  /** The journey being armed, so a test preview can name their own route. */
  previewTrack: ActiveTrack | undefined;
  /** Lets the sheet raise the blocked sheet when a test cannot be sent. */
  openBlockedSheet: () => void;
}

export function useNotifyBell(options: {
  track: ActiveTrack | undefined;
  ensureTrack: () => ActiveTrack | null;
  hasTransfers: boolean;
  source: 'notify_journey' | 'notify_trip';
}): NotifyBellState {
  const { track, ensureTrack, hasTransfers, source } = options;
  const { guardPremiumAction } = usePremiumGate();
  const isPremium = usePremium();
  const defaults = useNotificationPrefsStore((s) => s.defaults);
  const setDefaults = useNotificationPrefsStore((s) => s.setDefaults);
  const setTrackNotifications = useProfileStore((s) => s.setTrackNotifications);
  const clearTrackNotifications = useProfileStore((s) => s.clearTrackNotifications);
  const markDenied = useNotificationUiStore((s) => s.markDenied);
  const clearNotice = useNotificationUiStore((s) => s.clearNotice);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [blockedVisible, setBlockedVisible] = useState(false);
  const [allPast, setAllPast] = useState(false);
  // Held so the Settings round-trip can finish the job the rider started.
  const [pendingPrefs, setPendingPrefs] = useState<NotificationPrefs | null>(null);

  const armed = Boolean(track?.notify);

  const onPress = useCallback(() => {
    clearNotice();
    if (armed && track) {
      // Disarming is never gated. A lapsed subscriber must always be able to
      // turn something off — the rule `TrackButton` already applies to stopping.
      trackDisarm({
        prefs: track.notify,
        remainingAlarms: track.notificationIds?.length ?? 0,
        ageMinutes: Math.round((Date.now() - track.createdAt) / 60_000),
      });
      clearTrackNotifications(track.id);
      return;
    }
    void guardPremiumAction(() => {
      trackSheetOpen('journey', isPremium);
      setSheetVisible(true);
    }, source);
  }, [armed, track, clearTrackNotifications, clearNotice, guardPremiumAction, source, isPremium]);

  const applyArm = useCallback(
    async (target: ActiveTrack, prefs: NotificationPrefs, savedDefault: boolean) => {
      const result = await armTrack(target, prefs);
      if (result.ids.length > 0) {
        setTrackNotifications(target.id, prefs, result.ids);
        trackArm({
          prefs,
          alarms: result.alarms,
          skippedPast: result.skippedPast,
          legs: target.legs?.length ?? 0,
          transfers: target.transfers?.length ?? 0,
          savedDefault: savedDefault,
        });
        return true;
      }
      if (result.refusedBecause === 'all_past') {
        trackArmRefused('all_past');
        // Refused, and said so. A filled bell over a journey that has already
        // departed would be a lie — and this is routine, not an edge case,
        // because the search defaults to 00h00 (02 §5, 04 §3.3).
        setAllPast(true);
      }
      return false;
    },
    [setTrackNotifications],
  );

  const onConfirm = useCallback(
    (prefs: NotificationPrefs, saveAsDefault: boolean) => {
      setSheetVisible(false);
      if (saveAsDefault) {
        setDefaults(prefs);
        trackDefaultsChanged(prefs);
      }

      void (async () => {
        const target = ensureTrack();
        if (!target) {
          return;
        }

        const gate = await permissionGate('arm');
        if (gate === 'blocked') {
          // Remember what to finish, then explain why no dialog will appear.
          setPendingPrefs(prefs);
          setPendingIntent({ kind: 'armTrack', trackId: target.id, prefs });
          setBlockedVisible(true);
          return;
        }

        if (gate === 'askable' && (await ensurePermission('arm')) !== 'granted') {
          // They just answered the question. A quiet line, no sheet, no push to
          // Settings — and the bell stays empty, because arming did not happen
          // and must never look as though it did (05 §3.1).
          trackArmRefused('permission_denied');
          markDenied(target.id);
          return;
        }

        await applyArm(target, prefs, saveAsDefault);
      })();
    },
    [ensureTrack, setDefaults, applyArm, markDenied],
  );

  const onOpenSettings = useCallback(() => {
    const target = track ?? null;
    if (target && pendingPrefs) {
      setPendingIntent({ kind: 'armTrack', trackId: target.id, prefs: pendingPrefs });
    }
    trackSettingsOpened('blocked_sheet');
  }, [track, pendingPrefs]);

  return {
    armed,
    onPress,
    sheetVisible,
    blockedVisible,
    closeSheet: () => setSheetVisible(false),
    closeBlocked: () => setBlockedVisible(false),
    onConfirm,
    onOpenSettings,
    initialPrefs: defaults,
    hasTransfers,
    allPast,
    dismissAllPast: () => setAllPast(false),
    previewTrack: track,
    openBlockedSheet: () => setBlockedVisible(true),
  };
}
