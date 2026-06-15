import AsyncStorage from '@react-native-async-storage/async-storage';

import type { InterstitialSessionState } from '@/features/ads/lib/interstitial-policy';

const DISMISSED_AT_KEY = 'azores_hub_interstitial_dismissed_at';

/** In-memory session flags — reset on cold start, mirroring webapp sessionStorage. */
let sessionFlags: Pick<InterstitialSessionState, 'hasSearchedThisSession' | 'sessionDismissed'> =
  {
    hasSearchedThisSession: false,
    sessionDismissed: false,
  };

export async function loadInterstitialSessionState(): Promise<InterstitialSessionState> {
  const dismissedRaw = await AsyncStorage.getItem(DISMISSED_AT_KEY);
  const dismissedAt = dismissedRaw ? Number(dismissedRaw) : null;

  return {
    ...sessionFlags,
    dismissedAt: Number.isFinite(dismissedAt) ? dismissedAt : null,
  };
}

export async function persistInterstitialSessionState(
  patch: Partial<InterstitialSessionState>,
): Promise<void> {
  if (patch.hasSearchedThisSession != null) {
    sessionFlags.hasSearchedThisSession = patch.hasSearchedThisSession;
  }
  if (patch.sessionDismissed != null) {
    sessionFlags.sessionDismissed = patch.sessionDismissed;
  }
  if (patch.dismissedAt !== undefined) {
    if (patch.dismissedAt == null) {
      await AsyncStorage.removeItem(DISMISSED_AT_KEY);
    } else {
      await AsyncStorage.setItem(DISMISSED_AT_KEY, String(patch.dismissedAt));
    }
  }
}

export async function markInterstitialDismissed(nowMs: number): Promise<void> {
  await persistInterstitialSessionState({
    sessionDismissed: true,
    dismissedAt: nowMs,
  });
}

export function resetInterstitialSessionFlags(): void {
  sessionFlags = {
    hasSearchedThisSession: false,
    sessionDismissed: false,
  };
}

/** Test helper — reset in-memory session and persisted cooldown. */
export async function resetInterstitialStorageForTests(): Promise<void> {
  resetInterstitialSessionFlags();
  await AsyncStorage.removeItem(DISMISSED_AT_KEY);
}
