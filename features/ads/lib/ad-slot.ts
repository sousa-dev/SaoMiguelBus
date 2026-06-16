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
