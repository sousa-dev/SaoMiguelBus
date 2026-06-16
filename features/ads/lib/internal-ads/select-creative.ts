import type { ModuleKey } from '@/config/island';

import {
  getInternalCreativeById,
  INTERNAL_AD_CATALOG,
} from '@/features/ads/lib/internal-ads/catalog';
import type { InternalAdCreative } from '@/features/ads/lib/internal-ads/types';

const slotPicks = new Map<string, string>();

function isCreativeEnabled(creative: InternalAdCreative, enabledModuleKeys: ModuleKey[]): boolean {
  if (creative.kind === 'paywall') {
    return true;
  }
  return creative.moduleKey != null && enabledModuleKeys.includes(creative.moduleKey);
}

function buildPool(enabledModuleKeys: ModuleKey[]): InternalAdCreative[] {
  return INTERNAL_AD_CATALOG.filter((creative) => isCreativeEnabled(creative, enabledModuleKeys));
}

function weightedPick(pool: InternalAdCreative[], randomValue: number): InternalAdCreative {
  const totalWeight = pool.reduce((sum, creative) => sum + creative.weight, 0);
  let threshold = randomValue * totalWeight;
  for (const creative of pool) {
    threshold -= creative.weight;
    if (threshold <= 0) {
      return creative;
    }
  }
  return pool[pool.length - 1]!;
}

export function selectInternalCreative(input: {
  slotKey: string;
  enabledModuleKeys: ModuleKey[];
  random?: () => number;
}): InternalAdCreative | null {
  const pool = buildPool(input.enabledModuleKeys);
  if (pool.length === 0) {
    return null;
  }

  const cachedId = slotPicks.get(input.slotKey);
  if (cachedId) {
    const cached = getInternalCreativeById(cachedId);
    if (cached && isCreativeEnabled(cached, input.enabledModuleKeys)) {
      return cached;
    }
  }

  const randomValue = input.random?.() ?? Math.random();
  const picked = weightedPick(pool, randomValue);
  slotPicks.set(input.slotKey, picked.id);
  return picked;
}

/** Test-only reset. */
export function resetInternalAdSlotPicksForTests(): void {
  slotPicks.clear();
}
