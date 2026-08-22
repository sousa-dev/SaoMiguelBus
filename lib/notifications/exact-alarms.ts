/**
 * Android's second permission: may this app promise a notification at an exact
 * minute?
 *
 * Separate from notification permission, with its own three states, and denied
 * **by default** on Android 14+ for newly-installed apps targeting API 33+ — so
 * the ungranted path is the common case on new installs, not an edge case
 * (05 §4B.1).
 *
 * ---
 *
 * **Why this file exists at all.**
 *
 * `expo-notifications` 56.0.24 exposes no exact-alarm API to JavaScript: not
 * `canScheduleExactAlarms()`, not the `ACTION_REQUEST_SCHEDULE_EXACT_ALARM`
 * intent, not the state-changed broadcast. Its Android delegate checks the
 * permission internally and quietly falls back to an inexact alarm
 * (`ExpoSchedulingDelegate.setupAlarm`), which means there is no crash to guard
 * — and also no signal. The app would schedule "get off at the next stop",
 * believe it had done so, and the OS would deliver it up to half an hour late
 * with nobody any the wiser.
 *
 * The degradation rule in 11 §A1.1 is only implementable if the gate is
 * readable, so `modules/exact-alarm` is a local Expo module that exposes exactly
 * the three things the platform offers and the library does not.
 *
 * `requireOptionalNativeModule` rather than `requireNativeModule`: the module is
 * Android-only and absent from any build that has not been prebuilt against it,
 * and a missing native module must degrade to "we cannot tell" rather than
 * taking the app down at import time.
 */

import { requireOptionalNativeModule } from 'expo';
import type { EventSubscription } from 'expo-modules-core';
import { Platform } from 'react-native';

import { logger } from '@/lib/logger';
import type { ExactAlarmGate } from '@/lib/notifications/types';

interface ExactAlarmNativeModule {
  /** True on Android < 12, or when the user has granted the permission. */
  canScheduleExactAlarms: () => boolean;
  /** Opens the system screen for this app's exact-alarm permission. */
  openSettings: () => void;
  addListener: (
    event: 'onExactAlarmPermissionChange',
    listener: (payload: { granted: boolean }) => void,
  ) => EventSubscription;
}

const native = requireOptionalNativeModule<ExactAlarmNativeModule>('ExactAlarm');

/**
 * The current gate.
 *
 * iOS reports `unsupported`, which every caller treats as `granted`: there is no
 * exact-alarm concept there and delivery precision is never in question.
 *
 * A missing native module also reports `unsupported`. That is deliberately the
 * permissive answer rather than the cautious one — reporting `askable` would
 * disable stop alerts for every rider on a build where the module simply had not
 * been linked, which is a far more visible failure than the one it would be
 * guarding against.
 */
export function exactAlarmGate(): ExactAlarmGate {
  if (Platform.OS !== 'android') {
    return 'unsupported';
  }
  if (!native) {
    logger.warn('exact-alarm native module missing — assuming precise timing is available');
    return 'unsupported';
  }
  try {
    return native.canScheduleExactAlarms() ? 'granted' : 'askable';
  } catch (error) {
    logger.warn(`exact-alarm gate check failed: ${String(error)}`);
    return 'unsupported';
  }
}

/** Whether alarms scheduled right now will be delivered at the minute asked for. */
export function hasPreciseTiming(): boolean {
  return exactAlarmGate() !== 'askable';
}

/**
 * Send the rider to the system screen for this permission.
 *
 * There is no in-app dialog for it — unlike notification permission, Android
 * offers no runtime request, only a settings destination. The pending-intent
 * resume in 05 §3.3 covers the trip back.
 */
export function openExactAlarmSettings(): void {
  if (Platform.OS !== 'android' || !native) {
    return;
  }
  try {
    native.openSettings();
  } catch (error) {
    logger.warn(`could not open exact-alarm settings: ${String(error)}`);
  }
}

/**
 * Observe grants made OUTSIDE the app's own flow — a rider who wanders into
 * system settings on their own (11 §A1 requirement 4).
 *
 * The foreground check in `useNotificationPermissionResume` already covers the
 * round trip the app itself started. This covers the one it did not, so a rider
 * who fixes the permission while the sheet is open sees the greyed rows come
 * back rather than having to close and reopen it.
 *
 * Returns a no-op unsubscribe where the module is absent, so callers never
 * branch on platform.
 */
export function addExactAlarmListener(
  listener: (granted: boolean) => void,
): { remove: () => void } {
  if (Platform.OS !== 'android' || !native) {
    return { remove: () => {} };
  }
  try {
    const subscription = native.addListener('onExactAlarmPermissionChange', ({ granted }) =>
      listener(granted),
    );
    return { remove: () => subscription.remove() };
  } catch (error) {
    logger.warn(`could not observe exact-alarm permission: ${String(error)}`);
    return { remove: () => {} };
  }
}
