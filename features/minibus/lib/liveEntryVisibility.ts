/**
 * Moved to `features/live-tracking/lib/liveEntryVisibility`; this adapts the
 * minibus health payload (`{available}`) to the shared boolean rule.
 */
import {
  isLiveEntryEnabled,
  shouldShowLiveEntry,
} from '@/features/live-tracking/lib/liveEntryVisibility';
import { isMinibusTrackingAvailable } from '@/features/minibus/lib/trackingHealth';
import type { MinibusTrackingHealthResponse } from '@/lib/types';

export function shouldShowMinibusLiveEntry(
  isOnline: boolean,
  health: MinibusTrackingHealthResponse | undefined,
): boolean {
  return shouldShowLiveEntry(isOnline, isMinibusTrackingAvailable(health));
}

export function isMinibusLiveEntryEnabled(
  isOnline: boolean,
  health: MinibusTrackingHealthResponse | undefined,
): boolean {
  return isLiveEntryEnabled(isOnline, isMinibusTrackingAvailable(health));
}
