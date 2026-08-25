/**
 * Android notification channels — the OS-level categories a rider silences one
 * at a time.
 *
 * Two channels rather than one, and the split is a product decision rather than
 * tidiness: a rider who wants "the timetables changed" but not "time to leave"
 * (or the reverse) settles it in Android's own settings, and the app needs no
 * preference of its own to honour it. iOS has no equivalent, which is precisely
 * why `NotificationPrefs.serviceAnnouncements` exists as the in-app opt-out
 * guideline 4.5.4 expects — on iOS the only alternative was the system-wide
 * toggle, which kills bus alerts too (11 §I1.2).
 *
 * **Importance is a first-run decision and cannot be walked back.** Android
 * freezes a channel's importance when the channel is created; later calls with
 * the same id cannot raise it, because from then on it is a user-visible setting
 * the user owns. Correcting a mistake here needs a NEW channel id, not a patch
 * release — so `HIGH` vs `DEFAULT` below has to be right on a clean install, and
 * is on the device-QA list for exactly that reason (05 §4, 09 §6).
 *
 * `HIGH` for journey alarms is the point of the paid feature: a heads-up the
 * rider sees without unlocking. `DEFAULT` for announcements, which are
 * informational and must not buzz like an alarm at 07h00.
 *
 * Channel names are user-visible in Android settings and are resolved against
 * whatever locale is active at FIRST RUN. Android keeps the string it was given,
 * so a rider who later switches language keeps seeing the old name until
 * reinstall. Accepted, and noted in 07 §6 — re-registering on every language
 * change would be a write to a user-owned setting for a cosmetic gain.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import i18n from '@/lib/i18n';
import { logger } from '@/lib/logger';

/** Every journey alarm. Heads-up, because a missed bus is the failure mode. */
export const CHANNEL_JOURNEY_ALARMS = 'journey-alarms';
/** Service announcements. Quiet — important, not urgent. */
export const CHANNEL_SERVICE_ANNOUNCEMENTS = 'service-announcements';

/**
 * Register both channels. Safe to call repeatedly: Android treats a second
 * registration of an existing id as an update of the fields it still lets the
 * app own (name, description), and silently ignores importance.
 *
 * A no-op off Android — iOS has no channel concept, and this project ships no
 * web build (00 §3).
 */
export async function registerNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_JOURNEY_ALARMS, {
      name: i18n.t('notificationsChannelAlarms'),
      importance: Notifications.AndroidImportance.HIGH,
    });
    await Notifications.setNotificationChannelAsync(CHANNEL_SERVICE_ANNOUNCEMENTS, {
      name: i18n.t('notificationsChannelAnnouncements'),
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  } catch (error) {
    // Channel registration failing leaves scheduling to fall back on the
    // plugin's `defaultChannel`, which is a degraded notification rather than a
    // broken app. Never worth taking the shell down for.
    logger.warn(`notification channel registration failed: ${String(error)}`);
  }
}
