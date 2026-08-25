import type { InterstitialSessionState } from '@/features/ads/lib/interstitial-policy';
import type { InterstitialIntent } from '@/features/ads/lib/interstitial-request';

export type IntentSessionFlags = Pick<
  InterstitialSessionState,
  'hasShownThisSession' | 'sessionDismissed'
>;

/**
 * In-memory per-intent session flags — reset on cold start, mirroring the
 * webapp's sessionStorage.
 *
 * Keyed by intent so each surface earns its own "first show of the session".
 * A route search must not spend the MiniBus live-entry slot, or vice versa.
 */
const flagsByIntent = new Map<InterstitialIntent, IntentSessionFlags>();

function emptyFlags(): IntentSessionFlags {
  return { hasShownThisSession: false, sessionDismissed: false };
}

export function getSessionFlags(intent: InterstitialIntent): IntentSessionFlags {
  return { ...(flagsByIntent.get(intent) ?? emptyFlags()) };
}

export function updateSessionFlags(
  intent: InterstitialIntent,
  patch: Partial<IntentSessionFlags>,
): void {
  const current = flagsByIntent.get(intent) ?? emptyFlags();
  if (patch.hasShownThisSession != null) {
    current.hasShownThisSession = patch.hasShownThisSession;
  }
  if (patch.sessionDismissed != null) {
    current.sessionDismissed = patch.sessionDismissed;
  }
  flagsByIntent.set(intent, current);
}

export function resetSessionFlags(): void {
  flagsByIntent.clear();
}
