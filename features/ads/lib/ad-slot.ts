import type { AdPayload } from '@/lib/types';

export type AdSlotKind = 'first-party' | 'admob' | 'internal' | null;

export function resolveAdSlotKind(input: {
  enabled: boolean;
  forceInternal?: boolean;
  firstParty: AdPayload | null | undefined;
  fetched: boolean;
  canShowAdMob: boolean;
  isOnline: boolean;
  offlineInternalEligible: boolean;
}): AdSlotKind {
  if (!input.enabled) {
    return null;
  }
  if (input.forceInternal) {
    return 'internal';
  }
  if (input.firstParty) {
    return 'first-party';
  }
  if (input.fetched && input.canShowAdMob) {
    return 'admob';
  }
  if (input.isOnline && input.fetched) {
    return 'internal';
  }
  if (!input.isOnline && input.offlineInternalEligible) {
    return 'internal';
  }
  return null;
}

/**
 * Whether an internal house creative must be selected for this slot.
 *
 * `internal` renders one directly. `admob` needs one held in reserve: a Native
 * Advanced request can come back with no fill, and an empty inline slot falls
 * back to the house ad rather than to nothing. Selecting it up front keeps that
 * fallback synchronous — no second render pass, no flash of an empty slot.
 */
export function needsInternalCreative(kind: AdSlotKind): boolean {
  return kind === 'internal' || kind === 'admob';
}
