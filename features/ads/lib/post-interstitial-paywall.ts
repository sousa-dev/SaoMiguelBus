/** Chance the paywall opens by itself once a full-screen ad is dismissed. */
export const POST_INTERSTITIAL_PAYWALL_PROBABILITY = 0.5;

export type PostInterstitialPaywallInput = {
  isPremium: boolean;
  isAdFreeActive: boolean;
  /**
   * True only when a real ad was shown (first-party, AdMob or internal).
   * The waterfall's `upsell` fallback is already the promo, so it earns no roll.
   */
  showedRealAd: boolean;
  randomValue: number;
};

/**
 * Decide whether to auto-open the paywall after an interstitial is dismissed.
 *
 * Replaces the unconditional {@link PremiumUpsellModal} that used to chain onto
 * every interstitial close — the "close one ad, get another" pattern users
 * complained about. Now it is a coin flip, and when it wins the user lands on
 * the real paywall instead of an extra modal that only links to it.
 *
 * The variant (resident vs tourist) is resolved by `usePaywall` from the
 * personalization store, so callers just present it.
 */
export function shouldOpenPaywallAfterInterstitial(
  input: PostInterstitialPaywallInput,
): boolean {
  if (input.isPremium || input.isAdFreeActive) {
    return false;
  }
  if (!input.showedRealAd) {
    return false;
  }
  return input.randomValue < POST_INTERSTITIAL_PAYWALL_PROBABILITY;
}
