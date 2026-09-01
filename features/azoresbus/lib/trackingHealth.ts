import type { AzoresbusTrackingHealthResponse } from '@/lib/types';

/**
 * `disabled` and `unavailable` both mean "no live map", but they are kept
 * distinct in the type on purpose: one is a business decision and the other is
 * an outage, and analytics should be able to tell them apart even though the UI
 * treats them alike.
 */
export function isAzoresbusTrackingAvailable(
  data: AzoresbusTrackingHealthResponse | undefined,
): boolean {
  return data?.status === 'ok';
}
