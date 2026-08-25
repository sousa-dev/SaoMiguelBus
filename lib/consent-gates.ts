/** Pure consent gates — testable without React Native / Zustand. */
export function canInitAdMobFromState(decided: boolean, shouldShowAds: boolean): boolean {
  return decided && shouldShowAds;
}

export function canShowPersonalizedAdsFromState(decided: boolean, adsPurpose: boolean): boolean {
  return decided && adsPurpose;
}
