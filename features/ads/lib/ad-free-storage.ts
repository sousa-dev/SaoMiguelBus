import AsyncStorage from '@react-native-async-storage/async-storage';

import { AD_FREE_WINDOW_MS } from '@/features/ads/lib/ad-free-policy';

const AD_FREE_UNTIL_KEY = 'azores_hub_ad_free_until';

export function isAdFreeActive(untilMs: number | null, nowMs: number = Date.now()): boolean {
  return untilMs != null && Number.isFinite(untilMs) && untilMs > nowMs;
}

export function computeAdFreeUntil(
  nowMs: number,
  durationMs: number,
  currentUntilMs: number | null = null,
): number {
  const base = Math.max(nowMs, currentUntilMs ?? 0);
  return base + durationMs;
}

export async function loadAdFreeUntil(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(AD_FREE_UNTIL_KEY);
  const value = raw ? Number(raw) : null;
  return Number.isFinite(value) ? value : null;
}

export async function persistAdFreeUntil(untilMs: number): Promise<void> {
  await AsyncStorage.setItem(AD_FREE_UNTIL_KEY, String(untilMs));
}

export async function grantAdFreeWindow(
  nowMs: number = Date.now(),
  durationMs: number = AD_FREE_WINDOW_MS,
): Promise<number> {
  const current = await loadAdFreeUntil();
  const untilMs = computeAdFreeUntil(nowMs, durationMs, current);
  await persistAdFreeUntil(untilMs);
  return untilMs;
}

export async function clearAdFreeForTests(): Promise<void> {
  await AsyncStorage.removeItem(AD_FREE_UNTIL_KEY);
}
