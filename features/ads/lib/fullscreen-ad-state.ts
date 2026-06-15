/** In-memory flag for first-party interstitial visibility (transit-scoped modal). */
let firstPartyInterstitialVisible = false;

export function setFirstPartyInterstitialVisible(visible: boolean): void {
  firstPartyInterstitialVisible = visible;
}

export function isFirstPartyInterstitialVisible(): boolean {
  return firstPartyInterstitialVisible;
}
