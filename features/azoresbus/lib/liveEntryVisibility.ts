import {
  isLiveEntryEnabled,
  shouldShowLiveEntry,
} from '@/features/live-tracking/lib/liveEntryVisibility';
import { isAzoresbusTrackingAvailable } from '@/features/azoresbus/lib/trackingHealth';
import type { AzoresbusTrackingHealthResponse } from '@/lib/types';

/**
 * Three inputs, not two.
 *
 * `showTracking` is the server's bootstrap flag and answers "does this feature
 * exist for this island at all" -- a different question from "is the AVL up
 * right now". Keeping them separate is what lets the flag be flipped in admin to
 * retire the feature without an app release, while an outage merely hides it
 * until the vendor recovers.
 */
export function shouldShowAzoresbusLiveEntry(
  showTracking: boolean,
  isOnline: boolean,
  health: AzoresbusTrackingHealthResponse | undefined,
): boolean {
  if (!showTracking) {
    return false;
  }
  return shouldShowLiveEntry(isOnline, isAzoresbusTrackingAvailable(health));
}

export function isAzoresbusLiveEntryEnabled(
  showTracking: boolean,
  isOnline: boolean,
  health: AzoresbusTrackingHealthResponse | undefined,
): boolean {
  return (
    showTracking && isLiveEntryEnabled(isOnline, isAzoresbusTrackingAvailable(health))
  );
}
