/**
 * The data shapes the notification feature is built on.
 *
 * These live here, and not beside the zustand store that persists them, for one
 * structural reason: `plan.ts`, `content.ts` and `announcements.ts` are pure and
 * must stay importable by a runner that cannot mount React Native (09 §1). A
 * types module they can all reach without pulling in `zustand`, `AsyncStorage`
 * or the island config keeps that true by construction rather than by everyone
 * remembering to write `import type`.
 *
 * `lib/notification-prefs-store.ts` owns persistence and re-exports these, so a
 * caller that only wants the shape and a caller that wants the store both have
 * somewhere honest to import from.
 */

/** The four alarms a rider can arm against a journey (00 §4 R9). */
export type AlarmType = 'leaveNow' | 'change' | 'alight' | 'complete';

/** One alarm type's settings. */
export interface AlarmPref {
  enabled: boolean;
  /**
   * Lead time in minutes. Ignored by types that have no lead time.
   *
   * `alight` and `complete` have no meaningful lead — "one stop before" and "on
   * arrival" are the units — but the field is kept uniform anyway so the sheet,
   * the planner and the persist migration all handle one shape instead of a
   * union, and a future "alight X minutes early" needs no migration (03 §2.1).
   * The planner ignores it for those two, which is documented at that call site
   * rather than encoded as an absent property.
   */
  leadMinutes: number;
}

export interface NotificationPrefs {
  leaveNow: AlarmPref;
  change: AlarmPref;
  alight: AlarmPref;
  complete: AlarmPref;
  /**
   * Opt-in for the auto-track sweep (02 §6). Default false: `useAutoTrackPinnedRoutes`
   * starts tracks the rider never tapped, and a rider with 20 pins would
   * otherwise get phone alerts for journeys they never armed.
   */
  notifyPinnedRoutes: boolean;
  /**
   * Free service announcements — timetable changes and service notices.
   *
   * Default TRUE, and required as an in-app opt-out by App Store guideline 4.5.4:
   * journey alarms can be switched off by disarming the bell, but announcements
   * are auto-scheduled, and on iOS the only alternative was the system-wide
   * toggle, which kills bus alerts too (11 §I1.2).
   */
  serviceAnnouncements: boolean;
}

/**
 * The shipped defaults (03 §2).
 *
 * `complete` is off: a rider standing at their destination rarely needs telling.
 * It is offered rather than omitted because some people do want it, and the
 * analytics in 08 §4 are set up to tell us whether that judgement was right.
 *
 * Frozen, and handed out through `defaultNotificationPrefs()` rather than
 * directly, so a caller mutating what it thinks is its own copy cannot rewrite
 * everyone else's defaults.
 */
const SHIPPED_DEFAULTS: NotificationPrefs = Object.freeze({
  leaveNow: { enabled: true, leadMinutes: 10 },
  change: { enabled: true, leadMinutes: 5 },
  alight: { enabled: true, leadMinutes: 0 },
  complete: { enabled: false, leadMinutes: 0 },
  notifyPinnedRoutes: false,
  serviceAnnouncements: true,
}) as NotificationPrefs;

/** A fresh, deeply-independent copy of the shipped defaults. */
export function defaultNotificationPrefs(): NotificationPrefs {
  return {
    leaveNow: { ...SHIPPED_DEFAULTS.leaveNow },
    change: { ...SHIPPED_DEFAULTS.change },
    alight: { ...SHIPPED_DEFAULTS.alight },
    complete: { ...SHIPPED_DEFAULTS.complete },
    notifyPinnedRoutes: SHIPPED_DEFAULTS.notifyPinnedRoutes,
    serviceAnnouncements: SHIPPED_DEFAULTS.serviceAnnouncements,
  };
}

/**
 * The lead times the stepper offers (02 §4.1).
 *
 * A fixed list rather than a free number field: this is a walk-to-the-stop
 * buffer, and every value a rider could plausibly want is here.
 */
export const LEAD_MINUTE_OPTIONS = [2, 5, 10, 15, 20, 30] as const;

/**
 * Merge a persisted (or partial) preferences object onto the shipped defaults.
 *
 * Persisted blobs written by an older build can be missing a field this one
 * expects — `serviceAnnouncements` and `notifyPinnedRoutes` were both added
 * during development — and an absent boolean read as `undefined` is falsy,
 * which would silently switch service announcements OFF for every rider who
 * upgraded. Filling the gaps from the defaults is the only safe read.
 *
 * Lives here rather than beside the store for the reason this module exists:
 * anything importing `lib/notification-prefs-store.ts` drags in AsyncStorage,
 * and `tsx --test` cannot load a native module.
 */
export function mergeNotificationPrefs(
  stored: Partial<NotificationPrefs> | null | undefined,
): NotificationPrefs {
  const base = defaultNotificationPrefs();
  if (!stored) {
    return base;
  }
  return {
    leaveNow: { ...base.leaveNow, ...stored.leaveNow },
    change: { ...base.change, ...stored.change },
    alight: { ...base.alight, ...stored.alight },
    complete: { ...base.complete, ...stored.complete },
    notifyPinnedRoutes: stored.notifyPinnedRoutes ?? base.notifyPinnedRoutes,
    serviceAnnouncements: stored.serviceAnnouncements ?? base.serviceAnnouncements,
  };
}

/**
 * A one-shot service announcement — free, ungated, at most once per device ever.
 *
 * Content is carried as i18n KEYS, never as resolved strings, for the same
 * reason `TrackLabel` is: resolution happens at the scheduling call site against
 * the rider's active locale (01 §2.1).
 */
export interface ServiceAnnouncement {
  /** Stable dedupe key. Once fired for this id, never fires again on this device. */
  id: string;
  /** Absolute instant to fire. */
  fireAt: Date;
  titleKey: string;
  bodyKey: string;
  /** Where a tap lands. */
  route: string;
}

/**
 * Whether this device can promise a notification at an exact minute (05 §4B.1).
 *
 * `unsupported` is iOS, where the concept does not exist and precision is never
 * in question — it is treated exactly as `granted`, so callers branch on two
 * outcomes and the third is only there to keep analytics honest about which
 * platform reported it.
 */
export type ExactAlarmGate = 'granted' | 'askable' | 'unsupported';

/**
 * How much earlier a lead-time alarm fires when the platform will not commit to
 * an exact minute (11 §A1.1).
 *
 * Android may delay an inexact alarm by "at least 10 minutes", and by 10–30 in
 * Doze. Erring early is recoverable — the rider leaves a little sooner. Erring
 * late means a missed bus. That asymmetry is the entire rule.
 */
export const EXACT_ALARM_EARLY_BIAS_MIN = 10;

/**
 * The degradation rule, as a pure function (11 §A1.1).
 *
 * Not every alarm degrades equally, so they are not treated equally:
 *
 *  - **leave now** and **change is coming** are still offered, biased early
 *    enough to absorb the delay window. The confirmation copy must then say
 *    *around* rather than name a minute it cannot hit (07 §6).
 *  - **get off at next stop** and **journey complete** are DISABLED. A "get off
 *    now" arriving twenty minutes late does not merely fail to help — it sends
 *    the rider to the wrong village, and a late "you've arrived" is pure noise.
 *
 * Withholding what would mislead and keeping what still works is the honest
 * position, and it is why this returns a modified preference set rather than a
 * flag the planner has to interpret.
 */
export function degradeForInexactAlarms(prefs: NotificationPrefs): NotificationPrefs {
  return {
    ...prefs,
    leaveNow: {
      ...prefs.leaveNow,
      leadMinutes: prefs.leaveNow.leadMinutes + EXACT_ALARM_EARLY_BIAS_MIN,
    },
    change: {
      ...prefs.change,
      leadMinutes: prefs.change.leadMinutes + EXACT_ALARM_EARLY_BIAS_MIN,
    },
    alight: { ...prefs.alight, enabled: false },
    complete: { ...prefs.complete, enabled: false },
  };
}

/** Which alarm types cannot be honoured without exact-alarm permission. */
export const EXACT_ALARM_REQUIRED_TYPES: AlarmType[] = ['alight', 'complete'];
