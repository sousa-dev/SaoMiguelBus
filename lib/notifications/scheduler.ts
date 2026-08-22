/**
 * The OS adapter. Everything that actually talks to `expo-notifications` lives
 * here or in `./channels.ts`, and nothing else in the app imports the library.
 *
 * That confinement is the whole reason the module split in 04 §1 exists. One
 * import site means one place to guard for platform, one place to audit when the
 * SDK changes under us, and — the point that matters most day to day — it keeps
 * `plan.ts`, `content.ts` and `announcements.ts` pure, so they are testable
 * under a runner that cannot mount React Native at all (09 §1). This file is
 * deliberately kept thin enough that reading it IS the review; §6 of 09 is its
 * verification.
 *
 * Everything exported here is a no-op on an unsupported platform rather than a
 * throw, so callers never branch on `Platform.OS`.
 *
 * ---
 *
 * **Android exact alarms — what was actually confirmed, and what follows.**
 *
 * 05 §4B.2 asked build unit 1 to establish whether the library guards
 * `canScheduleExactAlarms()` or lets the `SecurityException` propagate, and
 * warned against assuming. Confirmed against the installed 56.0.24:
 * `ExpoSchedulingDelegate.setupAlarm` tests
 * `SDK_INT < S || alarmManager.canScheduleExactAlarms()` and falls back to
 * `AlarmManagerCompat.setAndAllowWhileIdle` when the permission is missing.
 *
 * So there is **no crash to defend against** — the feared `SecurityException`
 * cannot reach us, and no JS-side guard is written here for safety.
 *
 * What the library does instead is degrade **silently**: the alarm is accepted,
 * scheduled, and delivered inexactly, at least 10 minutes late and 10–30 in
 * Doze, with nothing in the JS return value saying so. That makes the
 * degradation rule in 11 §A1.1 more necessary rather than less, and it is why
 * `./exact-alarms.ts` exists at all.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import i18n from '@/lib/i18n';
import { logger } from '@/lib/logger';
import {
  CHANNEL_JOURNEY_ALARMS,
  CHANNEL_SERVICE_ANNOUNCEMENTS,
  registerNotificationChannels,
} from '@/lib/notifications/channels';
import {
  trackPermissionGate,
  trackPermissionRequest,
  trackPermissionResult,
  trackReceivedForeground,
  type PermissionTrigger,
} from '@/lib/notifications/analytics';
import { alarmContent } from '@/lib/notifications/content';
import { hasPreciseTiming } from '@/lib/notifications/exact-alarms';
import { previewAlarm, type PreviewSource } from '@/lib/notifications/preview';
import {
  MAX_SCHEDULED_ALARMS,
  planJourneyAlarms,
  planJourneyAlarmsDetailed,
  type PlannedAlarm,
} from '@/lib/notifications/plan';
import {
  degradeForInexactAlarms,
  type AlarmType,
  type NotificationPrefs,
  type ServiceAnnouncement,
} from '@/lib/notifications/types';
import type { ActiveTrack } from '@/lib/profile-store';

/** Where every notification in this feature lands when tapped (05 §6). */
export const NOTIFICATION_ROUTE = '/(tabs)/transit';

/**
 * Notifications are native-only here. This project ships no web build (00 §3),
 * and `expo-notifications` has no meaningful web scheduling story to guard.
 */
export function notificationsSupported(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

// ---------------------------------------------------------------------------
// Permission — three states, never a granted/denied boolean (05 §2.0)
// ---------------------------------------------------------------------------

export type PermissionGate = 'granted' | 'askable' | 'blocked';

/**
 * Read the gate. Never cached — the authoritative source is the OS, and a rider
 * can change it in system settings at any time without the app observing it
 * (03 §5), so this is called fresh at every decision point.
 */
export async function permissionGate(trigger?: PermissionTrigger): Promise<PermissionGate> {
  if (!notificationsSupported()) {
    return 'blocked';
  }
  try {
    const gate = gateFrom(await Notifications.getPermissionsAsync());
    // Reported only when a rider action prompted the check. This is also called
    // defensively from `armTrack` and on every foreground, and emitting there
    // would drown the funnel in events nobody asked a question about.
    if (trigger) {
      trackPermissionGate(gate, trigger);
    }
    return gate;
  } catch (error) {
    logger.warn(`notification permission check failed: ${String(error)}`);
    return 'blocked';
  }
}

/**
 * `granted` is deliberately not `settings.granted` alone: a provisionally
 * authorised iOS rider is allowed to receive notifications and would otherwise
 * be wrongly treated as denied (05 §2.0).
 */
function gateFrom(settings: Notifications.NotificationPermissionsStatus): PermissionGate {
  const allowed =
    settings.granted ||
    settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  if (allowed) {
    return 'granted';
  }
  if (settings.status === Notifications.PermissionStatus.UNDETERMINED || settings.canAskAgain) {
    return 'askable';
  }
  return 'blocked';
}

/**
 * Ask, but only when asking can produce a dialog.
 *
 * **Calling `requestPermissionsAsync()` while blocked is an invisible dead tap.**
 * The OS presents nothing and the promise resolves denied immediately, so the
 * rider presses a button and the app appears to do nothing at all. That is the
 * same class of bug commit `b764b2a` already fixed once here for the paywall —
 * "a paywall that cannot be shown must not be a dead tap" — and it is reached
 * permanently after one denial on iOS or two on Android 13+.
 *
 * The caller handles `blocked` by routing to system settings (05 §3.2), never by
 * asking again.
 */
export async function ensurePermission(trigger: PermissionTrigger): Promise<PermissionGate> {
  const gate = await permissionGate(trigger);
  if (gate !== 'askable') {
    return gate;
  }
  try {
    // Emitted here, immediately before the call that presents the dialog, so
    // `permission_request` counts prompts actually SHOWN rather than intentions
    // — the distinction the grant-rate question in 08 §4 depends on.
    trackPermissionRequest(trigger);
    const settings = await Notifications.requestPermissionsAsync();
    const result = gateFrom(settings);
    trackPermissionResult(
      trigger,
      result === 'granted' ? 'granted' : 'denied',
      settings.canAskAgain,
    );
    return result;
  } catch (error) {
    logger.warn(`notification permission request failed: ${String(error)}`);
    return 'blocked';
  }
}

// ---------------------------------------------------------------------------
// The four operations (04 §6)
// ---------------------------------------------------------------------------

/**
 * Plan, resolve, schedule. Returns the OS identifiers; the caller writes them to
 * `ActiveTrack.notificationIds` (KTD9).
 *
 * Returns `[]` — armed nothing — in four cases, each of which the UI reads as a
 * refusal rather than a success:
 *
 *  1. The platform has no notifications.
 *  2. Permission is not granted. Checked here as well as at the call site, so a
 *     caller that forgets cannot leave a filled bell standing for alarms the OS
 *     will never show.
 *  3. The track was started by the pinned-route sweep and the rider has not
 *     opted into notifications for those (02 §6).
 *  4. Every alarm the preferences ask for is already in the past (04 §3.3).
 */
export interface ArmResult {
  /** OS identifiers to write to `ActiveTrack.notificationIds`. Empty = armed nothing. */
  ids: string[];
  /** What was scheduled, so the card caption names the same instants (02 §5). */
  alarms: PlannedAlarm[];
  /** Alarms the rider asked for that had already passed (08 §2). */
  skippedPast: number;
  /**
   * Whether the platform will honour the exact minute. False means the copy has
   * to say "around" rather than name a time it cannot hit (07 §6).
   */
  precise: boolean;
  /** Why nothing was armed, when nothing was. */
  refusedBecause: 'unsupported' | 'auto_track' | 'permission' | 'all_past' | 'budget' | null;
}

const NOTHING_ARMED = (
  refusedBecause: ArmResult['refusedBecause'],
  precise = true,
  skippedPast = 0,
): ArmResult => ({ ids: [], alarms: [], skippedPast, precise, refusedBecause });

export async function armTrack(track: ActiveTrack, prefs: NotificationPrefs): Promise<ArmResult> {
  if (!notificationsSupported()) {
    return NOTHING_ARMED('unsupported');
  }
  if (track.auto && !prefs.notifyPinnedRoutes) {
    // `useAutoTrackPinnedRoutes` starts up to four tracks a day that the rider
    // never tapped, and describes itself as deliberately silent. Notifying on
    // those without an explicit opt-in would turn that sweep into an automatic
    // notification generator (02 §6).
    return NOTHING_ARMED('auto_track');
  }
  if ((await permissionGate()) !== 'granted') {
    return NOTHING_ARMED('permission');
  }

  // Without exact-alarm permission Android delivers late and says nothing, so
  // the preferences are degraded before planning rather than after (11 §A1.1).
  const precise = hasPreciseTiming();
  const effective = precise ? prefs : degradeForInexactAlarms(prefs);
  const { alarms, skippedPast } = planJourneyAlarmsDetailed(track, effective, new Date());
  if (alarms.length === 0) {
    return NOTHING_ARMED('all_past', precise, skippedPast);
  }

  const room = await remainingAlarmBudget();
  if (room <= 0) {
    logger.warn(`notification budget full (${MAX_SCHEDULED_ALARMS}) — armed nothing for ${track.id}`);
    return NOTHING_ARMED('budget', precise, skippedPast);
  }
  // Soonest first, because that is what the planner returns and what iOS would
  // keep anyway — but dropped here deliberately and with a log line rather than
  // silently discarded by the OS (04 §5).
  const scheduling = alarms.slice(0, room);
  if (scheduling.length < alarms.length) {
    logger.warn(
      `notification budget: dropped ${alarms.length - scheduling.length} farthest-future alarm(s) for ${track.id}`,
    );
  }

  const ids: string[] = [];
  for (const alarm of scheduling) {
    const id = await scheduleAlarm(track, alarm);
    if (id) {
      ids.push(id);
    }
  }
  return { ids, alarms: scheduling, skippedPast, precise, refusedBecause: null };
}

async function scheduleAlarm(track: ActiveTrack, alarm: PlannedAlarm): Promise<string | null> {
  const { titleKey, bodyKey, params } = alarmContent(alarm);
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t(titleKey, params),
        body: i18n.t(bodyKey, params),
        // No upsell, in the payload or behind the tap. Hard rule, 11 §I1.1.
        data: {
          route: NOTIFICATION_ROUTE,
          kind: 'journey',
          type: alarm.type,
          trackId: track.id,
          scheduledFor: alarm.at.getTime(),
        },
        sound: true,
        interruptionLevel: interruptionLevelFor(alarm.type),
        // NOTE: 05 §4A.3 asks for `threadIdentifier: track.id` so a journey's
        // three-to-five alarms collapse into one group in Notification Centre.
        // **expo-notifications 56.0.24 cannot do it.** The field is absent from
        // `NotificationContentInput`, and while the native record declares
        // `@Field var threadIdentifier`, that exists only for the read-back path
        // in `NotificationRecords.init(from:)` — `toUNMutableNotificationContent()`
        // applies title, body, badge, data, categoryIdentifier, sound,
        // attachments and interruptionLevel, and drops threadIdentifier on the
        // floor. Passing it would be silently ignored rather than rejected,
        // which is the worst of both worlds, so it is deliberately not passed.
        // The loss is cosmetic grouping only; delivery and interruption level
        // are unaffected.
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: alarm.at,
        channelId: CHANNEL_JOURNEY_ALARMS,
      },
    });
  } catch (error) {
    logger.warn(`failed to schedule ${alarm.type} for ${track.id}: ${String(error)}`);
    return null;
  }
}

/**
 * iOS interruption level, per alarm type (05 §4A.2, 11 §I2).
 *
 * `timeSensitive` breaks through Focus modes and the scheduled summary, which is
 * the difference between a commuting rider getting "time to leave" and getting
 * nothing at all. `complete` is deliberately NOT time-sensitive: nothing
 * requires immediate attention on arrival, the rider is standing at their
 * destination, and claiming Focus-breaking privilege for a "you have arrived"
 * message is the over-reach that gets the whole hand-reviewed entitlement
 * questioned — which would take `leaveNow` down with it.
 */
function interruptionLevelFor(type: AlarmType): 'active' | 'timeSensitive' {
  return type === 'complete' ? 'active' : 'timeSensitive';
}

/** Cancel a track's pending alarms. Never gated — turning something off always works. */
export async function disarmTrack(track: Pick<ActiveTrack, 'notificationIds'>): Promise<void> {
  await cancelNotificationIds(track.notificationIds ?? []);
}

/**
 * Cancel by identifier, tolerating ids the OS has already forgotten.
 *
 * An alarm that has fired, or one cancelled by a previous pass, is simply not
 * there any more; `cancelScheduledNotificationAsync` on a stale id is not a
 * condition worth propagating to a caller that is usually a store action.
 */
export async function cancelNotificationIds(ids: string[]): Promise<void> {
  if (!notificationsSupported() || ids.length === 0) {
    return;
  }
  await Promise.all(
    ids.map(async (id) => {
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
      } catch (error) {
        logger.debug(`notification ${id} was already gone: ${String(error)}`);
      }
    }),
  );
}

/**
 * Schedule a free service announcement.
 *
 * **Never prompts.** The announcement channel schedules only if permission is
 * already granted; a free rider who has never armed a journey alarm has no
 * reason to have granted it, and a cold prompt at launch for something they
 * cannot yet see the value of is exactly the prompt people deny permanently
 * (01 §4.1). When permission is absent the caller offers the in-app row instead.
 *
 * Returns the OS identifier, or `null` when nothing was scheduled.
 */
export async function scheduleAnnouncement(
  announcement: ServiceAnnouncement,
): Promise<string | null> {
  if (!notificationsSupported()) {
    return null;
  }
  if (announcement.fireAt.getTime() <= Date.now()) {
    // A past DATE trigger fires immediately on some platforms, which would land
    // a "check your times" alert as a startled duplicate of the banner already
    // on screen (01 §3.3).
    return null;
  }
  if ((await permissionGate()) !== 'granted') {
    return null;
  }

  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t(announcement.titleKey),
        body: i18n.t(announcement.bodyKey),
        data: {
          route: announcement.route,
          kind: 'announcement',
          announcementId: announcement.id,
        },
        sound: true,
        // Important, not urgent. Burning Focus-breaking privilege on a timetable
        // notice is what gets the entitlement questioned (11 §I2).
        interruptionLevel: 'active',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: announcement.fireAt,
        channelId: CHANNEL_SERVICE_ANNOUNCEMENTS,
      },
    });
  } catch (error) {
    logger.warn(`failed to schedule announcement ${announcement.id}: ${String(error)}`);
    return null;
  }
}

/** Drop everything pending. Used by the GDPR delete flow (03 §4.2). */
export async function cancelAllScheduledNotifications(): Promise<void> {
  if (!notificationsSupported()) {
    return;
  }
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    logger.warn(`failed to cancel all notifications: ${String(error)}`);
  }
}

/**
 * How many more alarms may be scheduled before the iOS cap bites.
 *
 * iOS keeps only the 64 soonest-firing pending notifications per app and
 * silently discards the rest, so the OS's own count — not the app's idea of it —
 * is what this has to be measured against.
 */
async function remainingAlarmBudget(): Promise<number> {
  try {
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    return MAX_SCHEDULED_ALARMS - pending.length;
  } catch (error) {
    logger.warn(`could not read pending notifications: ${String(error)}`);
    return MAX_SCHEDULED_ALARMS;
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

/**
 * How a notification behaves when it lands while the app is already open.
 *
 * Shown rather than swallowed: a rider watching the tracking widget should still
 * see "get off at the next stop" surface, because the widget and the alarm
 * answer different questions and the alarm is the one that interrupts.
 *
 * `shouldShowBanner` / `shouldShowList` are the SDK 56 shape. The single
 * `shouldShowAlert` boolean they replaced is still accepted but deprecated, and
 * returning only it now fails to satisfy `NotificationBehavior`.
 *
 * `shouldSetBadge: false` — the app has no badge semantics anywhere, and a badge
 * count nothing ever clears is a support ticket (05 §6).
 */
function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = notification.request.content.data as { type?: unknown } | undefined;
      trackReceivedForeground(typeof data?.type === 'string' ? data.type : 'announcement');
      return {
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      };
    },
  });
}

/**
 * Process-wide notification setup: the foreground presentation handler, then the
 * Android channels.
 *
 * Ordered deliberately. Channels must exist before anything is scheduled against
 * them, and the handler must be installed before a notification can arrive — so
 * this runs once from the app shell rather than lazily from the first arm, where
 * a rider tapping the bell would be racing it.
 */
export async function initNotifications(): Promise<void> {
  if (!notificationsSupported()) {
    return;
  }
  try {
    configureNotificationHandler();
    await registerNotificationChannels();
  } catch (error) {
    logger.warn(`notification init failed: ${String(error)}`);
  }
}

// ---------------------------------------------------------------------------
// Reconciliation (04 §6.2)
// ---------------------------------------------------------------------------

/** One track whose armed state has to be written back to the store. */
export interface ReconcileUpdate {
  trackId: string;
  /** Empty when the track has been disarmed. */
  notificationIds: string[];
  /** False means clear `notify` too — the journey is over. */
  armed: boolean;
}

/**
 * Bring the OS and the store back into agreement, once per launch.
 *
 * They drift for ordinary reasons: an app update, a crash between scheduling and
 * writing the ids back, alarms that have simply fired. Two things go wrong if
 * nothing reconciles — the OS holds alarms for journeys the app has forgotten,
 * and a filled bell claims alarms the OS is no longer holding.
 *
 * Takes the tracks as an argument rather than reading the profile store, because
 * that store now imports this module to cancel; reaching back the other way
 * would be a runtime import cycle. The caller applies the returned updates.
 *
 * **Must run after the profile store has rehydrated.** Running against an empty
 * store would see no live tracks, classify every pending alarm as an orphan, and
 * cancel the lot (05 §5.1).
 */
export async function reconcileNotifications(tracks: ActiveTrack[]): Promise<ReconcileUpdate[]> {
  if (!notificationsSupported()) {
    return [];
  }

  let pending: Notifications.NotificationRequest[];
  try {
    pending = await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    logger.warn(`reconcile could not read pending notifications: ${String(error)}`);
    return [];
  }

  const pendingIds = new Set(pending.map((request) => request.identifier));
  const claimed = new Set(tracks.flatMap((t) => t.notificationIds ?? []));

  // Orphans: anything the OS holds that no live track claims.
  //
  // Service announcements are deliberately exempt. They are scheduled against
  // the announcement store, not against a track, so they are unclaimed BY
  // DESIGN — sweeping them up here would cancel the 1 September warning on the
  // next launch after arming it, which is precisely the bug that would be
  // hardest to notice and worst to ship.
  const orphans = pending.filter((request) => {
    if (claimed.has(request.identifier)) {
      return false;
    }
    const kind = (request.content.data as { kind?: string } | undefined)?.kind;
    // Announcements are unclaimed by design — they hang off the announcement
    // store, not off a track — and a test is a few seconds from firing. Sweeping
    // either would cancel something the rider is actively expecting.
    return kind !== 'announcement' && kind !== 'test';
  });
  if (orphans.length > 0) {
    logger.debug(`reconcile: cancelling ${orphans.length} orphaned notification(s)`);
    await cancelNotificationIds(orphans.map((request) => request.identifier));
  }

  const now = new Date();
  const updates: ReconcileUpdate[] = [];

  for (const track of tracks) {
    if (!track.notify) {
      continue;
    }
    const ids = track.notificationIds ?? [];
    const stillPending = ids.filter((id) => pendingIds.has(id));
    if (ids.length > 0 && stillPending.length === ids.length) {
      continue; // the OS agrees with the store
    }

    // Something is missing. If any alarm is still in the future the track is
    // worth re-arming — this is what makes armed state survive an app update.
    // If they have all passed, the journey is over and the bell should stop
    // claiming otherwise.
    if (planJourneyAlarms(track, track.notify, now).length === 0) {
      await cancelNotificationIds(stillPending);
      updates.push({ trackId: track.id, notificationIds: [], armed: false });
      continue;
    }

    // Cancel the survivors before re-arming, or the rider gets two of each.
    await cancelNotificationIds(stillPending);
    const rearmed = await armTrack({ ...track, notificationIds: [] }, track.notify);
    updates.push({ trackId: track.id, notificationIds: rearmed.ids, armed: rearmed.ids.length > 0 });
  }

  return updates;
}

// ---------------------------------------------------------------------------
// Taps (05 §6)
// ---------------------------------------------------------------------------

/** The parts of a tapped notification the app routes on. */
export interface NotificationTap {
  /** Where to navigate. Always present on notifications this feature schedules. */
  route: string;
  kind: 'journey' | 'announcement' | 'unknown';
  /** The alarm type, for journey alarms. */
  type?: string;
  /** The announcement id, for announcements. */
  announcementId?: string;
  /** When the alarm was scheduled to fire, for `minutes_from_scheduled` (08 §2). */
  scheduledFor?: number;
}

function tapFrom(response: Notifications.NotificationResponse | null): NotificationTap | null {
  if (!response) {
    return null;
  }
  // Only a plain tap navigates. A dismissal, or a custom action button added
  // later, must not silently take the rider somewhere they did not ask to go.
  if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
    return null;
  }
  const data = response.notification.request.content.data as
    | { route?: unknown; kind?: unknown; type?: unknown; announcementId?: unknown; scheduledFor?: unknown }
    | undefined;
  const route = typeof data?.route === 'string' ? data.route : null;
  if (!route) {
    return null;
  }
  return {
    route,
    kind: data?.kind === 'journey' || data?.kind === 'announcement' ? data.kind : 'unknown',
    type: typeof data?.type === 'string' ? data.type : undefined,
    announcementId: typeof data?.announcementId === 'string' ? data.announcementId : undefined,
    scheduledFor: typeof data?.scheduledFor === 'number' ? data.scheduledFor : undefined,
  };
}

/** Taps that arrive while the app is already running. */
export function addNotificationTapListener(
  listener: (tap: NotificationTap) => void,
): { remove: () => void } {
  if (!notificationsSupported()) {
    return { remove: () => {} };
  }
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const tap = tapFrom(response);
    if (tap) {
      listener(tap);
    }
  });
  return { remove: () => subscription.remove() };
}

/**
 * The tap that launched the app from terminated.
 *
 * **Cold-start taps do not arrive through the listener.** They are waiting in
 * `getLastNotificationResponseAsync()` before any listener could have been
 * registered, so a implementation that only listens loses exactly the tap that
 * mattered most — the one where the rider was not already in the app.
 */
export async function getInitialNotificationTap(): Promise<NotificationTap | null> {
  if (!notificationsSupported()) {
    return null;
  }
  try {
    return tapFrom(await Notifications.getLastNotificationResponseAsync());
  } catch (error) {
    logger.warn(`could not read the launching notification: ${String(error)}`);
    return null;
  }
}

/**
 * Forget the launching tap once it has been acted on.
 *
 * Without this the same response is still there on the next remount, and the app
 * re-navigates every time — a rider who tapped an alarm once finds themselves
 * pushed back to transit whenever this hook happens to re-run.
 */
export async function clearInitialNotificationTap(): Promise<void> {
  if (!notificationsSupported()) {
    return;
  }
  try {
    await Notifications.clearLastNotificationResponseAsync();
  } catch (error) {
    logger.debug(`could not clear the launching notification: ${String(error)}`);
  }
}

// ---------------------------------------------------------------------------
// Test notifications
// ---------------------------------------------------------------------------

/**
 * How long after tapping Test the notification arrives.
 *
 * Long enough to lock the phone and see it the way it will actually be seen —
 * on a lock screen, which is the whole question the button is answering — and
 * short enough that nobody wonders whether it worked.
 */
export const TEST_NOTIFICATION_DELAY_S = 5;

/**
 * Fire one notification exactly as the real thing would arrive, for a rider who
 * wants to know what they are signing up for.
 *
 * It deliberately goes through `alarmContent`, the same channel, and the same
 * interruption level, because a preview that took a shortcut would be answering
 * a different question. What it does NOT do is impersonate a real alarm: the
 * title carries a translated Test marker, so a rider who pockets their phone and
 * reads it thirty seconds later cannot reasonably act on it and go and stand at
 * a bus stop.
 *
 * Returns the gate, so the caller can route `blocked` to the settings sheet and
 * `askable`-then-denied to the quiet inline line rather than claiming success.
 */
export async function sendTestNotification(
  kind: AlarmType | 'announcement',
  source: PreviewSource,
  trigger: PermissionTrigger = 'settings_row',
): Promise<PermissionGate> {
  if (!notificationsSupported()) {
    return 'blocked';
  }
  // The highest-intent moment there is: they pressed a button whose entire
  // purpose is to produce a notification.
  const gate = await ensurePermission(trigger);
  if (gate !== 'granted') {
    return gate;
  }

  const isAnnouncement = kind === 'announcement';
  const content = isAnnouncement
    ? {
        titleKey: 'notificationScheduleChangeTitle',
        bodyKey: 'notificationScheduleChangeBody',
        params: {} as Record<string, string | number>,
      }
    : alarmContent(previewAlarm(kind, source, new Date()));

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${i18n.t('notificationsTestBadge')} · ${i18n.t(content.titleKey, content.params)}`,
        body: i18n.t(content.bodyKey, content.params),
        data: {
          route: NOTIFICATION_ROUTE,
          // Its own kind, so reconciliation leaves it alone and the tap
          // analytics do not count it as a real alarm being opened.
          kind: 'test',
          type: kind,
        },
        sound: true,
        interruptionLevel: isAnnouncement ? 'active' : interruptionLevelFor(kind),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: TEST_NOTIFICATION_DELAY_S,
        repeats: false,
      },
    });
    return 'granted';
  } catch (error) {
    logger.warn(`failed to send test notification (${kind}): ${String(error)}`);
    return 'granted';
  }
}
