/**
 * One-shot intent flag: set when an upsell is requested while signed out, so the
 * sign-in screen can resume into the paywall once authentication succeeds.
 */
let pending = false;

export function setPendingPaywall(value: boolean): void {
  pending = value;
}

export function consumePendingPaywall(): boolean {
  const was = pending;
  pending = false;
  return was;
}
