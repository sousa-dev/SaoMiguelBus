/**
 * A planned alarm → the i18n keys and interpolation values that describe it.
 *
 * PURE, and it emits **keys, never resolved strings**. Same contract as
 * `TrackLabel` in `lib/bus-tracking.ts`, and for the reason that module's header
 * records: this is a paid feature, and a Portuguese subscriber was once reading
 * a paid widget in English because a string got baked in somewhere upstream of
 * the renderer.
 *
 * Resolution happens once, in `scheduler.ts`, against the rider's active locale
 * at SCHEDULE time. A rider who changes language after arming keeps the old
 * wording on alarms already handed to the OS — re-resolving would mean
 * cancelling and rescheduling every pending alarm on a language change, which is
 * disproportionate to the gain. Recorded as a known limitation in 04 §4.
 *
 * Nothing here may ever produce marketing, a paywall prompt or a subscription
 * reminder. That is a hard rule (11 §I1.1): a rider grants notification
 * permission for bus alerts, and the moment one arrives selling something they
 * revoke it — and revocation is effectively permanent, so one promotional
 * notification costs the alarm channel for that rider forever.
 */

import type { PlannedAlarm } from '@/lib/notifications/plan';

export interface AlarmContent {
  titleKey: string;
  bodyKey: string;
  /**
   * What `i18next.t` interpolates. The planner's `tight` selector is removed on
   * the way through: it has already done its job choosing the keys below, and
   * passing a boolean into a catalogue that never references it is noise.
   */
  params: Record<string, string | number>;
}

export function alarmContent(alarm: PlannedAlarm): AlarmContent {
  const { tight, ...params } = alarm.params;
  const interpolation = params as Record<string, string | number>;

  switch (alarm.type) {
    case 'leaveNow':
      return {
        titleKey: 'notificationLeaveNowTitle',
        bodyKey: 'notificationLeaveNowBody',
        params: interpolation,
      };

    case 'change':
      // A tight change is the one moment `computeJourneyStatus` calls "the one
      // moment this widget earns its subscription" — same instant, more urgent
      // words (04 §3.2).
      return tight === true
        ? {
            titleKey: 'notificationChangeTightTitle',
            bodyKey: 'notificationChangeTightBody',
            params: interpolation,
          }
        : {
            titleKey: 'notificationChangeTitle',
            bodyKey: 'notificationChangeBody',
            params: interpolation,
          };

    case 'alight':
      return {
        titleKey: 'notificationAlightTitle',
        bodyKey: 'notificationAlightBody',
        params: interpolation,
      };

    case 'complete':
      return {
        titleKey: 'notificationCompleteTitle',
        bodyKey: 'notificationCompleteBody',
        params: interpolation,
      };
  }
}
