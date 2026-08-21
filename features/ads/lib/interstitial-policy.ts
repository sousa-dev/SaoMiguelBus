/** Cross-session cooldown after the user dismisses the upsell modal (~30 min). */
export const INTERSTITIAL_COOLDOWN_MS = 30 * 60 * 1000;

/** Subsequent shows for the same intent in one session (webapp parity). */
export const INTERSTITIAL_SUBSEQUENT_PROBABILITY = 0.15;

export type InterstitialSessionState = {
  hasShownThisSession: boolean;
  sessionDismissed: boolean;
  dismissedAt: number | null;
};

export type InterstitialPolicyDecision = {
  show: boolean;
  nextState: Partial<InterstitialSessionState>;
};

/**
 * Decide whether to show a full-screen interstitial.
 *
 * Mirrors SaoMiguelBus-webapp `showInterstitialAd` timing rules: guaranteed on
 * the first qualifying event of a session, then probabilistic. Callers pass
 * per-intent state (see `interstitial-session-flags`), so each surface — route
 * search, MiniBus live entry — gets its own first show rather than one surface
 * spending the other's.
 */
export function evaluateInterstitialPolicy(
  state: InterstitialSessionState,
  nowMs: number,
  randomValue: number,
): InterstitialPolicyDecision {
  if (!state.hasShownThisSession && !state.sessionDismissed) {
    return {
      show: true,
      nextState: { hasShownThisSession: true },
    };
  }

  if (state.sessionDismissed) {
    return { show: false, nextState: {} };
  }

  if (state.dismissedAt != null && nowMs - state.dismissedAt < INTERSTITIAL_COOLDOWN_MS) {
    return { show: false, nextState: {} };
  }

  if (randomValue < INTERSTITIAL_SUBSEQUENT_PROBABILITY) {
    return { show: true, nextState: {} };
  }

  return { show: false, nextState: {} };
}
