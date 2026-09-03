/**
 * Orchestration between a tracked journey and the native live-trip bar.
 *
 * Thin on purpose: the pure trip-tracking logic lives in `./plan` (tested
 * directly), and this file only wires it to `./native`. `useLiveTripBar` calls
 * these two functions and nothing else, so the hook itself stays a binding
 * rather than a place logic accumulates.
 */
import type { ActiveTrack } from '@/lib/profile-store';

import { startLiveTrip, stopLiveTrip } from './native';
import { buildLiveTripStart, initialLiveTripSnapshot } from './plan';
import type { LiveTripDescriptor, LiveTripStartResult, LiveTripStrings } from './types';

export { buildLiveTripStart, initialLiveTripSnapshot } from './plan';
export type { LiveTripStartPlan } from './plan';

/**
 * The descriptor rides along on the result (not just whether it started) so
 * a caller that needs to register a push token later — the iOS path — has
 * the trip/leg data to build that registration without recomputing the plan
 * a second time against possibly-changed `active` state.
 */
export async function startLiveTripBar(
  track: ActiveTrack,
  strings: LiveTripStrings,
  apiBase: string,
  islandKey: string,
  sessionId: string,
  now: Date,
): Promise<(LiveTripStartResult & { descriptor: LiveTripDescriptor }) | null> {
  const plan = buildLiveTripStart(track, strings, apiBase, islandKey, sessionId, now);
  if (!plan) {
    return null;
  }
  const result = await startLiveTrip(plan.descriptor, plan.strings, initialLiveTripSnapshot(track, now));
  return { ...result, descriptor: plan.descriptor };
}

export async function stopLiveTripBar(): Promise<void> {
  await stopLiveTrip();
}
