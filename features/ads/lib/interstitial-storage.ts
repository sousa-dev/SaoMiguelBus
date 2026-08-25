import AsyncStorage from '@react-native-async-storage/async-storage';

import type { InterstitialSessionState } from '@/features/ads/lib/interstitial-policy';
import type { InterstitialIntent } from '@/features/ads/lib/interstitial-request';
import {
  getSessionFlags,
  resetSessionFlags,
  updateSessionFlags,
} from '@/features/ads/lib/interstitial-session-flags';

const DISMISSED_AT_KEY = 'azores_hub_interstitial_dismissed_at';

/**
 * Session flags are per intent and live in memory; `dismissedAt` stays shared
 * and persisted, so dismissing any interstitial cools down the probabilistic
 * branch everywhere.
 */
export async function loadInterstitialSessionState(
  intent: InterstitialIntent,
): Promise<InterstitialSessionState> {
  const dismissedRaw = await AsyncStorage.getItem(DISMISSED_AT_KEY);
  const dismissedAt = dismissedRaw ? Number(dismissedRaw) : null;

  return {
    ...getSessionFlags(intent),
    dismissedAt: Number.isFinite(dismissedAt) ? dismissedAt : null,
  };
}

export async function persistInterstitialSessionState(
  intent: InterstitialIntent,
  patch: Partial<InterstitialSessionState>,
): Promise<void> {
  updateSessionFlags(intent, patch);

  if (patch.dismissedAt !== undefined) {
    if (patch.dismissedAt == null) {
      await AsyncStorage.removeItem(DISMISSED_AT_KEY);
    } else {
      await AsyncStorage.setItem(DISMISSED_AT_KEY, String(patch.dismissedAt));
    }
  }
}

export async function markInterstitialDismissed(
  intent: InterstitialIntent,
  nowMs: number,
): Promise<void> {
  await persistInterstitialSessionState(intent, {
    sessionDismissed: true,
    dismissedAt: nowMs,
  });
}

export function resetInterstitialSessionFlags(): void {
  resetSessionFlags();
}

/** Test helper — reset in-memory session and persisted cooldown. */
export async function resetInterstitialStorageForTests(): Promise<void> {
  resetInterstitialSessionFlags();
  await AsyncStorage.removeItem(DISMISSED_AT_KEY);
}
