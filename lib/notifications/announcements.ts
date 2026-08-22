/**
 * Service announcements — free, ungated, at most once per device ever.
 *
 * PURE. The clock is a parameter, there is no storage and no OS, which is what
 * makes every rule below reachable from a unit test (09 §3).
 *
 * The first instance is the 1 September 2026 network cutover, but the mechanism
 * is deliberately general: a second date is already known — 14 September, when
 * the summer season ends and route 307 goes from 33 to 38 journeys — and writing
 * this twice under deadline is the outcome to avoid.
 *
 * **Everything is derived from what the server already sends (KTD6).** No date
 * literal appears here, which keeps intact the strictest convention in this part
 * of the codebase — `features/transit/lib/schedule-config.ts` opens with *"No
 * date literal appears here or anywhere downstream: the only instants are the
 * ones the server sent"* — and means the next announcement is an admin edit
 * rather than an app release.
 */

import type { ServiceAnnouncement } from '@/lib/notifications/types';
import type { TransitScheduleConfig } from '@/lib/types';

/**
 * The local hour an announcement fires (KTD7).
 *
 * The cutover instant is local MIDNIGHT, and a notification at midnight is
 * hostile and would be ignored. Passed in as a parameter rather than read here,
 * so tests can vary it without touching the clock.
 */
export const ANNOUNCE_HOUR_LOCAL = 7;

/** Where a tap lands — `ScheduleChangeBanner` is already there, already explaining. */
export const ANNOUNCEMENT_ROUTE = '/(tabs)/transit';

/**
 * The dedupe key. **Derived from the cutover instant, never from `banner.id`.**
 *
 * The obvious choice is wrong, and the deployed configuration is what exposes
 * it. `resolveBanner()` merges a per-phase override *including its `id`*, and
 * production carries exactly such an override:
 *
 * | phase     | window          | resolved `banner.id`        |
 * |-----------|-----------------|-----------------------------|
 * | `preview` | until 31 Aug    | `azoresbus-preview-2026-08` |
 * | `live`    | 1 Sept → 1 Oct  | `azoresbus-live-2026-09`    |
 *
 * The id therefore changes at the *precise instant the announcement is due*.
 * Scheduling happens during `preview` and records the preview id; the next
 * resolution runs during `live`, sees a different id, finds no match in the
 * fired store, and schedules the whole thing again. Only the past-instant rule
 * would prevent the duplicate — a correctness guarantee resting on two unrelated
 * rules happening to interact (01 §3.1.1).
 *
 * Keyed on `cutoverAt` it is stable across every phase, and it changes exactly
 * when it should: if the operator moves the date, that is a genuinely new
 * announcement and re-firing is correct. `banner.id` is left to do the one job
 * it was designed for — banner dismissal.
 */
export function announcementId(cutoverAt: string): string {
  return `cutover:${cutoverAt}`;
}

export function resolveAnnouncements(
  config: TransitScheduleConfig | null | undefined,
  options: { now: number; announceHour: number },
): ServiceAnnouncement[] {
  const cutoverAt = config?.cutoverAt;
  if (!cutoverAt) {
    // `transitSchedule` is always present — an island with no azoresbus flags
    // still gets `{cutoverAt: null, …}` — so "is anything armed" is this check,
    // not the presence of the block.
    return [];
  }
  if (config?.phase === 'settled') {
    // The changeover is old news. Nothing to announce.
    return [];
  }

  const cutover = Date.parse(cutoverAt);
  if (!Number.isFinite(cutover)) {
    return [];
  }

  const fireAt = morningOf(new Date(cutover), options.announceHour);

  // The past-instant rule (01 §3.3). A rider who first opens the app at 09h00 on
  // the day must NOT get a notification for 07h00 that morning:
  // `scheduleNotificationAsync` with a past DATE trigger delivers immediately on
  // some platforms, which would fire "check your times" as a startled duplicate
  // of the banner already on their screen. They get the banner instead, which is
  // the better surface for someone already looking at the app.
  if (fireAt.getTime() <= options.now) {
    return [];
  }

  return [
    {
      id: announcementId(cutoverAt),
      fireAt,
      titleKey: 'notificationScheduleChangeTitle',
      bodyKey: 'notificationScheduleChangeBody',
      route: ANNOUNCEMENT_ROUTE,
    },
  ];
}

/**
 * The morning of the LOCAL calendar date an instant falls on.
 *
 * `getFullYear`/`getMonth`/`getDate` are local getters and `new Date(y, m, d, h)`
 * is a local construction, so the pair round-trips through the device's own
 * timezone — which is the entire point. `toISOString()` would be UTC, and
 * `lib/bus-tracking.ts` documents what that costs with a worked example: at
 * 23h30 Azores winter it already reads TOMORROW, which once anchored a bus
 * leaving in 15 minutes to tomorrow's midnight and displayed a ~24 hour
 * countdown. The same class of bug here fires the announcement on 2 September.
 *
 * Worth stating because it looks like an off-by-one and is not: the deployed
 * `cutoverAt` is `2026-09-01T00:00:00+00:00`, and Azores is UTC+0 under summer
 * DST, so that offset IS local midnight on 1 September rather than an hour out.
 * A winter cutover at local midnight would arrive as `-01:00`, and this still
 * resolves it to the correct local day.
 */
function morningOf(instant: Date, hour: number): Date {
  return new Date(instant.getFullYear(), instant.getMonth(), instant.getDate(), hour, 0, 0, 0);
}
