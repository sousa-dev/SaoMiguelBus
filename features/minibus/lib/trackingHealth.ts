import type { MinibusTrackingHealthResponse } from '@/lib/types';

export function isMinibusTrackingAvailable(
  data: MinibusTrackingHealthResponse | undefined,
): boolean {
  return data?.available === true;
}
