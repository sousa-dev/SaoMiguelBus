import type { AdPayload } from '@/lib/types';

export type AdSlotKind = 'first-party' | 'admob' | null;

export function resolveAdSlotKind(input: {
  enabled: boolean;
  firstParty: AdPayload | null | undefined;
  fetched: boolean;
  canShowAdMob: boolean;
}): AdSlotKind {
  if (!input.enabled) {
    return null;
  }
  if (input.firstParty) {
    return 'first-party';
  }
  if (input.fetched && input.canShowAdMob) {
    return 'admob';
  }
  return null;
}
