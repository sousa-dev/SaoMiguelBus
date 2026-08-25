/**
 * Notification analytics (08).
 *
 * Thin typed wrappers over `track()`, in one place, so the property names cannot
 * drift between call sites — a funnel is only as good as the consistency of the
 * keys it is built from.
 *
 * Two guards already live inside `track()` and must NOT be repeated here:
 * analytics consent, and the admin check that keeps staff testing out of the
 * funnels.
 *
 * **A new module string needs no API change.** `AnalyticsEvent.module` is a
 * `CharField(max_length=32)` with no `choices`, and the reporting endpoints
 * filter on it as free text — the precedent the Tours tab already set.
 *
 * **What is deliberately never sent** (08 §3): stop names, route numbers, and
 * origin/destination. A rider's itinerary is their movement pattern; counts and
 * durations answer every product question here, and the journey detail is far
 * more sensitive than anything it would buy.
 */

import { track } from '@/lib/analytics';
import type { PlannedAlarm } from '@/lib/notifications/plan';
import type { NotificationPrefs } from '@/lib/notifications/types';

const MODULE = 'notifications';

/**
 * Events already reported in this app run.
 *
 * Two of the announcement events are emitted from `useServiceAnnouncements`,
 * which sweeps on launch **and on every return to the foreground**. That cadence
 * is right for the scheduling decision and wrong for telemetry: while a cutover
 * is armed and permission is absent — the ordinary state for a free rider before
 * the date — `due` is non-empty on every sweep, so an unguarded call emits one
 * event per foreground, forever.
 *
 * That would corrupt the one number this channel exists to produce.
 * `announcement_skipped{no_permission}` is meant to count DEVICES that would have
 * been warned and were not (08 §2, 10 §2); counting foregrounds instead makes it
 * a measure of how often people open the app, which is both wrong and
 * flattering. It also piles events into the offline queue on exactly the devices
 * that cannot flush it.
 *
 * Session-scoped rather than persisted, deliberately. Persisting would report
 * each device once ever, which under-counts a population that is meant to be
 * measured over a window; a module-level Set reports once per app run, which is
 * proportional and needs no storage or migration.
 */
const reportedThisSession = new Set<string>();

function firstTimeThisSession(key: string): boolean {
  if (reportedThisSession.has(key)) {
    return false;
  }
  reportedThisSession.add(key);
  return true;
}

/** Which types are enabled, as a stable csv — `alight,change,leaveNow`. */
function enabledTypes(prefs: NotificationPrefs): string {
  return (['leaveNow', 'change', 'alight', 'complete'] as const)
    .filter((type) => prefs[type].enabled)
    .join(',');
}

export function trackArm(options: {
  prefs: NotificationPrefs;
  alarms: PlannedAlarm[];
  skippedPast: number;
  legs: number;
  transfers: number;
  savedDefault: boolean;
}) {
  track(MODULE, 'arm', {
    types: enabledTypes(options.prefs),
    lead_leave: options.prefs.leaveNow.leadMinutes,
    lead_change: options.prefs.change.leadMinutes,
    legs: options.legs,
    transfers: options.transfers,
    alarms_scheduled: options.alarms.length,
    // The one to watch. A high value means riders are routinely arming journeys
    // that have already departed, which points at `DEFAULT_SEARCH_TIME = '00:00'`
    // returning the whole service day — a UX problem this feature would merely
    // be surfacing (08 §2).
    alarms_skipped_past: options.skippedPast,
    saved_default: options.savedDefault,
  });
}

export function trackDisarm(options: {
  prefs: NotificationPrefs | undefined;
  remainingAlarms: number;
  ageMinutes: number;
}) {
  track(MODULE, 'disarm', {
    types: options.prefs ? enabledTypes(options.prefs) : '',
    remaining_alarms: options.remainingAlarms,
    age_minutes: options.ageMinutes,
  });
}

export function trackArmRefused(reason: 'all_past' | 'permission_denied' | 'no_types') {
  track(MODULE, 'arm_refused', { reason });
}

export function trackSheetOpen(mode: 'journey' | 'default', isPremium: boolean) {
  track(MODULE, 'sheet_open', { mode, is_premium: isPremium });
}

export function trackDefaultsChanged(prefs: NotificationPrefs) {
  track(MODULE, 'defaults_changed', {
    types: enabledTypes(prefs),
    lead_leave: prefs.leaveNow.leadMinutes,
    lead_change: prefs.change.leadMinutes,
    pinned_routes: prefs.notifyPinnedRoutes,
  });
}

// --- permission -------------------------------------------------------------

export type PermissionTrigger = 'arm' | 'announcement_row' | 'settings_row';

/**
 * `permission_gate{gate: 'blocked'}` is the size of the recoverable audience —
 * riders who want alerts but cannot be prompted. If it is large, the settings
 * row is carrying real weight and deserves more prominence (08 §2).
 */
export function trackPermissionGate(gate: string, trigger: PermissionTrigger) {
  track(MODULE, 'permission_gate', { gate, trigger });
}

export function trackPermissionRequest(trigger: PermissionTrigger) {
  track(MODULE, 'permission_request', { trigger });
}

export function trackPermissionResult(
  trigger: PermissionTrigger,
  status: 'granted' | 'denied',
  canAskAgain: boolean,
) {
  track(MODULE, 'permission_result', { trigger, status, can_ask_again: canAskAgain });
}

export function trackSettingsOpened(from: 'blocked_sheet' | 'revoked_warning' | 'settings_row') {
  track(MODULE, 'settings_opened', { from });
}

/**
 * `settings_opened` → `settings_returned{resumed: true}` is the conversion rate
 * of the whole recovery path. A high `settings_opened` with a low `resumed`
 * means riders are going to Settings and not finding the toggle — a copy
 * problem, not a code one.
 */
export function trackSettingsReturned(gate: string, resumed: boolean) {
  track(MODULE, 'settings_returned', { gate, resumed });
}

export function trackPermissionRevokedDetected(armedTracks: number) {
  track(MODULE, 'permission_revoked_detected', { armed_tracks: armedTracks });
}

// --- announcements ----------------------------------------------------------

export function trackAnnouncementScheduled(announcementId: string, hoursAhead: number) {
  track(MODULE, 'announcement_scheduled', {
    announcement_id: announcementId,
    hours_ahead: hoursAhead,
  });
}

/**
 * `announcement_skipped{reason: 'no_permission'}` is the direct measure of the
 * 1 September reach problem (10 §2). It counts devices that WOULD have been
 * warned and were not.
 */
export function trackAnnouncementSkipped(
  announcementId: string,
  reason: 'past' | 'already_fired' | 'no_permission' | 'settled' | 'opted_out',
) {
  // Keyed on the reason as well as the id: a skip that changes cause — permission
  // granted, so now it is skipped as `already_fired` — is a different fact and
  // worth reporting.
  if (!firstTimeThisSession(`skipped:${announcementId}:${reason}`)) {
    return;
  }
  track(MODULE, 'announcement_skipped', { announcement_id: announcementId, reason });
}

export function trackAnnouncementPromptShown(announcementId: string) {
  // The row is re-rendered on every sweep until the rider acts on it; the event
  // means "this rider was offered it", not "it was drawn again".
  if (!firstTimeThisSession(`prompt:${announcementId}`)) {
    return;
  }
  track(MODULE, 'announcement_prompt_shown', { announcement_id: announcementId });
}

export function trackAnnouncementOpened(announcementId: string) {
  track(MODULE, 'announcement_opened', { announcement_id: announcementId });
}

// --- delivery and taps ------------------------------------------------------

/**
 * **There is no delivery receipt for a local notification.** `arm` proves the
 * app scheduled something; nothing proves the rider saw it. `opened` is a LOWER
 * BOUND on delivery and must never be reported as a delivery rate (08 §2).
 */
export function trackNotificationOpened(type: string, minutesFromScheduled: number | undefined) {
  track(MODULE, 'opened', { type, minutes_from_scheduled: minutesFromScheduled });
}

/**
 * The rider asked to see what a notification looks like.
 *
 * Worth its own event rather than folding into `permission_request`: a high
 * test rate against a low arm rate means people are curious but not convinced,
 * which is a copy problem in the preference sheet rather than a permission one.
 */
export function trackTestSent(type: string, surface: 'settings_row' | 'prefs_sheet') {
  track(MODULE, 'test_sent', { type, surface });
}

export function trackReceivedForeground(type: string) {
  track(MODULE, 'received_foreground', { type });
}
