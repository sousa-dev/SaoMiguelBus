/**
 * The line a rider reads on the card straight after arming.
 *
 * > We'll tell you at 08h22, 08h47 and one stop before you arrive
 *
 * Concrete times, deliberately (02 §5). A rider needs to see that the alarms are
 * set to something *plausible*, and a wrong time visible now is a bug reported
 * now rather than a missed bus reported next week. The instants come from the
 * same `PlannedAlarm[]` that was handed to the OS, so the caption and the
 * schedule cannot drift apart.
 *
 * PURE, and it emits keys rather than sentences — the caller runs them through
 * `t`. Same contract as `TrackLabel` in `lib/bus-tracking.ts`.
 */

import type { PlannedAlarm } from '@/lib/notifications/plan';

export interface ArmedSummary {
  /**
   * Key for the times line, or null when nothing with a clock time was armed —
   * `alight` is described by position, not by a minute, so a rider who armed
   * only that gets the alight line alone rather than "We'll tell you at ".
   */
  timesKey: 'notificationsArmed' | 'notificationsArmedApprox' | null;
  /** Interpolated into `timesKey` as `{{times}}`. */
  times: string;
  /** Append `notificationsArmedAlight`. */
  includesAlight: boolean;
  /** Show `notificationsSomeSkipped` — the journey was already under way. */
  someSkipped: boolean;
}

/**
 * `HHhMM`, the spelling the rest of this app uses for a wall clock, from a local
 * instant. Never `toISOString()`, which is UTC and would print the wrong hour
 * for every rider west of Greenwich — which is all of them.
 */
function wallClock(at: Date): string {
  return `${String(at.getHours()).padStart(2, '0')}h${String(at.getMinutes()).padStart(2, '0')}`;
}

export function summariseArmedAlarms(
  alarms: PlannedAlarm[],
  options: { precise: boolean; skippedPast: number },
): ArmedSummary | null {
  if (alarms.length === 0) {
    return null;
  }

  const timed = alarms.filter((alarm) => alarm.type !== 'alight');
  const includesAlight = alarms.some((alarm) => alarm.type === 'alight');

  return {
    // Without exact-alarm permission the delivery window is ±10 minutes, so the
    // confirmation must say *around* rather than name a minute the platform has
    // not agreed to hit (07 §6, and the general rule in 07 §2 that this app
    // never promises certainty it cannot deliver).
    timesKey: timed.length === 0 ? null : options.precise ? 'notificationsArmed' : 'notificationsArmedApprox',
    times: timed.map((alarm) => wallClock(alarm.at)).join(', '),
    includesAlight,
    // Said out loud rather than hidden: the rider chose four alerts and is
    // getting two, and the reason is something they can see for themselves
    // once it is named (02 §5).
    someSkipped: options.skippedPast > 0,
  };
}
