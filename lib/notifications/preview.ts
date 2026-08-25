/**
 * Building a realistic alarm for the "Test" buttons.
 *
 * PURE, so the thing a rider is shown can be asserted rather than eyeballed.
 *
 * The point of a test notification is to answer "what will this actually look
 * like on my phone" — so it goes through the SAME `alarmContent` mapping and the
 * same channel and interruption level as the real thing. Anything bespoke here
 * would be testing a mock of the feature rather than the feature.
 *
 * Two things it must not do:
 *
 *  1. **It must not be mistaken for a real alarm.** A rider who taps Test,
 *     pockets the phone, and reads "Time to leave — your 25 leaves Ponta Delgada
 *     in 10 min" thirty seconds later could plausibly go and stand at a bus
 *     stop. The scheduler marks the title, and `isPreview` is what tells it to.
 *  2. **It must not name a stop from another island.** This app is
 *     white-labelled by `islandKey`, so a hardcoded São Miguel stop would be
 *     wrong for a second island. Real rider data is preferred, and the fallback
 *     is a translated generic rather than a place name.
 */

import type { PlannedAlarm } from '@/lib/notifications/plan';
import type { AlarmType } from '@/lib/notifications/types';

/**
 * Whatever real journey detail is to hand. Every field is optional: the rider
 * may have nothing tracked or pinned yet, which is exactly when they are most
 * likely to be trying the button.
 */
export interface PreviewSource {
  routeNumber?: string;
  /** Where they would board. */
  boardStop?: string;
  /** Where they would get off. */
  alightStop?: string;
  /** The lead time their preferences currently carry, so the copy matches. */
  leadMinutes?: number;
  /** Translated stand-in used when the rider has no journey to borrow from. */
  fallbackStop: string;
  /** Neutral stand-in route. Not a real line on any island. */
  fallbackRoute: string;
}

/**
 * A single alarm of the requested type, ready for `alarmContent`.
 *
 * `at` is set to `now` and is never used for scheduling — the caller fires the
 * test on a short interval instead. It exists because `PlannedAlarm` requires
 * it, and a preview has no timetable to derive one from.
 */
export function previewAlarm(
  type: AlarmType,
  source: PreviewSource,
  now: Date,
): PlannedAlarm {
  const route = source.routeNumber?.trim() || source.fallbackRoute;
  const board = source.boardStop?.trim() || source.fallbackStop;
  const alight = source.alightStop?.trim() || source.fallbackStop;
  const minutes = source.leadMinutes ?? 0;

  const params: PlannedAlarm['params'] =
    type === 'leaveNow'
      ? { route, stop: board, minutes }
      : type === 'change'
        ? { route, stop: board, minutes, tight: false }
        : { stop: alight };

  return { type, at: new Date(now.getTime()), legIndex: 0, params };
}
