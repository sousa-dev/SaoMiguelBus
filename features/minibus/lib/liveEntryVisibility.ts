import { isMinibusTrackingAvailable } from '@/features/minibus/lib/trackingHealth';
import type { MinibusTrackingHealthResponse } from '@/lib/types';

export function shouldShowMinibusLiveEntry(
  isOnline: boolean,
  health: MinibusTrackingHealthResponse | undefined,
): boolean {
  return isMinibusTrackingAvailable(health) || !isOnline;
}

export function isMinibusLiveEntryEnabled(
  isOnline: boolean,
  health: MinibusTrackingHealthResponse | undefined,
): boolean {
  return isOnline && isMinibusTrackingAvailable(health);
}
