/** In-memory flag for first-party interstitial visibility (transit-scoped modal). */
let firstPartyInterstitialVisible = false;

/** In-memory flag for internal fullscreen ad (interstitial or app-open). */
let internalFullscreenAdVisible = false;

export function setFirstPartyInterstitialVisible(visible: boolean): void {
  firstPartyInterstitialVisible = visible;
}

export function isFirstPartyInterstitialVisible(): boolean {
  return firstPartyInterstitialVisible;
}

export function setInternalFullscreenAdVisible(visible: boolean): void {
  internalFullscreenAdVisible = visible;
}

export function isInternalFullscreenAdVisible(): boolean {
  return internalFullscreenAdVisible;
}

export function isAnyFullscreenAdVisible(): boolean {
  return firstPartyInterstitialVisible || internalFullscreenAdVisible;
}
